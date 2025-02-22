let _occludedTilesState = "";
let weatherBlockIsLevels
const _weatherBlockModuleName = "weatherblock";
let _wbIsMaskInverted = false;
Hooks.on("canvasReady", () => {
  _wbIsMaskInverted = canvas.scene.getFlag(
    _weatherBlockModuleName,
    "invertMask"
  );
  weatherBlockIsLevels = game.modules.get("levels")?.active;
  refreshWheatherBlockingMask();
  setTimeout(function(){refreshWheatherBlockingMask(); }, 5000);
});

Hooks.on("createDrawing", () => {
  refreshWheatherBlockingMask();
});

Hooks.on("updateDrawing", () => {
  refreshWheatherBlockingMask();
});

Hooks.on("deleteDrawing", () => {
  refreshWheatherBlockingMask();
});

Hooks.on("canvasInit", () => {
  canvas.effects.mask = null;
});

function refreshWheatherBlockingMask(sight = false) {
  if (sight && !_wbIsMaskInverted) {
    let _oldOccludedTilesState = _occludedTilesState;
    _occludedTilesState = "";
    canvas.foreground.placeables.forEach((t) => {
      if (t.roomPoly && t.occluded)
        _occludedTilesState += t.roomPoly.contains(
          canvas.tokens.controlled[0].center.x,
          canvas.tokens.controlled[0].center.y
        )
          ? "t"
          : "f";
    });
    if (_occludedTilesState == _oldOccludedTilesState) return;
  }
  let g = new PIXI.Graphics();
  if (!_wbIsMaskInverted)
    g.beginFill(0x000000).drawRect(
      0,
      0,
      canvas.scene.dimensions.width,
      canvas.scene.dimensions.height
    );
  function adjustPolygonPoints(drawing) {
    let globalPoints = [];
    if (drawing.data.points.length != 0) {
      drawing.data.points.forEach((p) => {
        globalPoints.push(p[0] + drawing.x, p[1] + drawing.y);
      });
    } else {
      globalPoints = [
        drawing.x,
        drawing.y,
        drawing.x + drawing.width,
        drawing.y,
        drawing.x + drawing.width,
        drawing.y + drawing.height,
        drawing.x,
        drawing.y + drawing.height,
      ];
    }
    return globalPoints;
  }
  let weatherBlockDrawings = canvas.drawings.placeables.filter(
    (d) => d.data.text == "blockWeather"
  );
  weatherBlockDrawings.forEach((drawing) => {
    let p = new PIXI.Polygon(adjustPolygonPoints(drawing));
    if (!_wbIsMaskInverted) {
      g.beginHole().drawPolygon(p).endHole();
    } else {
      g.beginFill().drawPolygon(p).endFill();
    }
  });
  if (!_wbIsMaskInverted) {
    canvas.foreground.placeables.forEach((t) => {
      if (
        t.roomPoly &&
        (t.occluded ||
          t.alpha == 0 ||
          (canvas.tokens.controlled[0] &&
            t.roomPoly.contains(
              canvas.tokens.controlled[0].center.x,
              canvas.tokens.controlled[0].center.y
            )))
      ) {
        if (weatherBlockIsLevels) {
          let { rangeBottom, rangeTop } = _levels.getFlagsForObject(t);
          if (rangeTop == Infinity && canvas.tokens.controlled[0] && canvas.tokens.controlled[0].data.elevation < rangeBottom) {
            g.beginHole().drawPolygon(t.roomPoly).endHole();
          }
        } else {
          g.beginHole().drawPolygon(t.roomPoly).endHole();
        }
      }
    });
  }
  canvas.effects.mask = g;
  g.name = "weatherBlock";
  canvas.effects.children.forEach((c) => {
    if (c.name == "weatherBlock") c.destroy();
  });
  canvas.effects.addChild(g);
  if (canvas.fxmaster) {
    canvas.fxmaster.mask = g;
    canvas.fxmaster.children.forEach((c) => {
      if (c.name == "weatherBlock") c.destroy();
    });
    canvas.fxmaster.addChild(g);
  }
}

Hooks.on("updateToken",(token,updates)=>{
  if("elevation" in updates && weatherBlockIsLevels){
    _occludedTilesState="" 
  }
})

/******************
 * SCENE SETTINGS *
 ******************/

Hooks.on("renderSceneConfig", (app, html, data) => {
  let invertMask =
    app.object.getFlag(_weatherBlockModuleName, "invertMask") || false;

  const wbhtml = `
    <div class="form-group">
        <label>${game.i18n.localize(
          "weatherblock.sceneconfig.invertMask.name"
        )}</label>
        <input id="invertMask" type="checkbox" name="invertMask" data-dtype="Boolean" ${
          invertMask ? "checked" : ""
        }>
        <p class="notes">${game.i18n.localize(
          "weatherblock.sceneconfig.invertMask.hint"
        )}</p>
    </div>
    `;
  const weatherFind = html.find("select[name ='weather']");
  const formGroup = weatherFind.closest(".form-group");
  formGroup.after(wbhtml);
  html
    .find($('button[name="submit"]'))
    .click(app.object, _weatherBlockerSaveSceneConfig);
});

/***********************
 * SAVE SCENE SETTINGS *
 ***********************/

async function _weatherBlockerSaveSceneConfig(event) {
  let html = this.parentElement;
  await event.data.setFlag(
    _weatherBlockModuleName,
    "invertMask",
    html.querySelectorAll("input[name ='invertMask']")[0].checked
  );
  _wbIsMaskInverted = event.data.getFlag(_weatherBlockModuleName, "invertMask");
}
