$(document).ready(function()
{
  function rgb2lab(rgb)
  {
    var r = rgb[0] / 255;
    var g = rgb[1] / 255;
    var b = rgb[2] / 255;
    var x, y, z;

    r = (r > 0.04045) ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = (g > 0.04045) ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = (b > 0.04045) ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

    x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
    y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
    z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;

    x = (x > 0.008856) ? Math.pow(x, 1 / 3) : (7.787 * x) + 16 / 116;
    y = (y > 0.008856) ? Math.pow(y, 1 / 3) : (7.787 * y) + 16 / 116;
    z = (z > 0.008856) ? Math.pow(z, 1 / 3) : (7.787 * z) + 16 / 116;

    return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)]
  }

  function lab2rgb(lab)
  {
    var y = (lab[0] + 16) / 116;
    var x = lab[1] / 500 + y;
    var z = y - lab[2] / 200;
    var r, g, b;

    x = 0.95047 * ((x * x * x > 0.008856) ? x * x * x : (x - 16 / 116) / 7.787);
    y = 1.00000 * ((y * y * y > 0.008856) ? y * y * y : (y - 16 / 116) / 7.787);
    z = 1.08883 * ((z * z * z > 0.008856) ? z * z * z : (z - 16 / 116) / 7.787);

    r = x * 3.2406 + y * -1.5372 + z * -0.4986;
    g = x * -0.9689 + y * 1.8758 + z * 0.0415;
    b = x * 0.0557 + y * -0.2040 + z * 1.0570;

    r = (r > 0.0031308) ? (1.055 * Math.pow(r, 1 / 2.4) - 0.055) : 12.92 * r;
    g = (g > 0.0031308) ? (1.055 * Math.pow(g, 1 / 2.4) - 0.055) : 12.92 * g;
    b = (b > 0.0031308) ? (1.055 * Math.pow(b, 1 / 2.4) - 0.055) : 12.92 * b;

    return [Math.max(0, Math.min(1, r)) * 255,
      Math.max(0, Math.min(1, g)) * 255,
      Math.max(0, Math.min(1, b)) * 255
    ]
  }

  function deltaE(labA, labB)
  {
    var deltaL = labA[0] - labB[0];
    var deltaA = labA[1] - labB[1];
    var deltaB = labA[2] - labB[2];

    var c1 = Math.sqrt(labA[1] * labA[1] + labA[2] * labA[2]);
    var c2 = Math.sqrt(labB[1] * labB[1] + labB[2] * labB[2]);

    var deltaC = c1 - c2;
    var deltaH = deltaA * deltaA + deltaB * deltaB - deltaC * deltaC;
    deltaH = deltaH < 0 ? 0 : Math.sqrt(deltaH);

    var sc = 1.0 + 0.045 * c1;
    var sh = 1.0 + 0.015 * c1;

    var deltaLKlsl = deltaL / (1.0);
    var deltaCkcsc = deltaC / (sc);
    var deltaHkhsh = deltaH / (sh);

    var i = deltaLKlsl * deltaLKlsl + deltaCkcsc * deltaCkcsc + deltaHkhsh * deltaHkhsh;

    return i < 0 ? 0 : Math.sqrt(i);
  }

  var modePick = null;
  const MODE_REMOVE = "REMOVE";
  const MODE_RESTORE = "RESTORE";
  const MODE_DRAW_TEXT = "DRAW_TEXT";

  var imageUrl = null;

  var imgSrc;
  var imgDst;

  var canvasSrc = document.querySelector(`#canvas-src`);
  var canvasDst = document.querySelector(`#canvas-dst`);

  var stack = [];
  var stackRedo = [];

  var stackPreProcess = [
    // {
    //   mode: MODE_REMOVE,
    //   color: [255, 255, 255],
    //   threshold: 10
    // },
    // {
    //   mode: MODE_REMOVE,
    //   color: [0, 0, 0],
    //   threshold: 10
    // }
  ];


	$('#input-image').change(function(e)
	{
    var url = window.URL.createObjectURL(this.files[0]);

    $('#table-images').css('visibility', 'visible');
    $('#controls').css('visibility', 'visible');

		init(url);
  });

  $('#btn-op-undo').click(function(e)
  {
    if (!stack.length)
    {
      return;
    }

    popStackModifier();

    updateButtonUndoRedo();
    updateStackChange();
  });

  $('#btn-op-redo').click(function(e)
  {
    if (!stackRedo.length)
    {
      return;
    }

    var mod = stackRedo.pop();
    stack.push(mod);

    updateButtonUndoRedo();
    updateStackChange();
  });

  $('#btn-remove-color').click(function(e)
  {
    if (!imageUrl)
    {
      return;
    }

    startModRemoveColor();
  });

  $('#btn-restore-color').click(function(e)
  {
    if (!imageUrl)
    {
      return;
    }

    startModRestoreColor();
  });

  $('#btn-draw-text').click(function(e)
  {
    if (!imageUrl)
    {
      return;
    }

    var text = $('#text-string').val();
    var font = $('#text-font').val();
    var color = $('#text-color').val();

    var align = $('#text-align').val();
    var baseline = $('#text-baseline').val();

    var relPosX = $("#pos-x").val();
    var relPosY = $("#pos-y").val();

    var mod = createModifierDrawText(text, font, color, align, baseline, relPosX, relPosY);
    addStackModifier(mod);

    updateStackChange();
    updateButtonUndoRedo();
  });

  function getThresholdRemove()
  {
    return parseInt(document.querySelector(`#threshold-remove`).value);
  }

  function getThresholdRestore()
  {
    return parseInt(document.querySelector(`#threshold-restore`).value);
  }

	function canvasLoadImage(url, canvasEl)
  {
    var img = new Image();
    img.src = url;
    img.onload = function()
    {
      canvasEl.width = img.width;
      canvasEl.height = img.height;
      canvasEl.getContext("2d").drawImage(img, 0, 0);
    };

    return img;
  }

  function canvasPutImage(canvasEl, pixels)
  {
    var context = canvasEl.getContext("2d");
    context.putImageData(pixels, 0, 0);
  }

  function canvasDrawText(canvasEl, opt)
  {
    var ctx = canvasEl.getContext("2d");

    ctx.font = opt.font;

    ctx.textAlign = opt.align;
    ctx.textBaseline = opt.baseline;

    ctx.fillStyle = opt.color;

    // var posX = (canvasEl.width/100) * opt.relPosX*100;
    // var posY = (canvasEl.height/100) * opt.relPosY*100;
    var posX = canvasEl.width * opt.relPosX;
    var posY = canvasEl.height * opt.relPosY;

    ctx.fillText(opt.text, posX, posY);
  }

  function init(url)
  {
    imageUrl = url;

    imgSrc = canvasLoadImage(url, canvasSrc);
    imgDst = canvasLoadImage(url, canvasDst);

    stack = [];

    colorSamplerOff();

    updateStackChange();

    updateButtonUndoRedo();
  }

  function canvasGetImageDataUrl(canvas)
  {
    return canvas.toDataURL("image/png");
  }

  function colorSamplerOn()
  {
    $('#canvas-src').colorSampler(
    {
      onPreview: function(color)
      {
      },
      onSelect: function(color)
      {
        onSamplerSelectColor(color.match(/\d+/g));
      }
    });

    $('#canvas-dst').colorSampler(
      {
        onPreview: function(color)
        {
        },
        onSelect: function(color)
        {
          onSamplerSelectColor(color.match(/\d+/g));
        }
      });
  }

  function colorSamplerOff()
  {
    $('#canvas-src').off("colorSampler", "**" );
    $('#canvas-dst').off("colorSampler", "**" );
    $('#canvas-src').unbind();
    $('#canvas-dst').unbind();

    $('.color-sampler-preview.active').removeClass('active');
  }

  function onSamplerSelectColor(color)
  {
    console.log(color);

    if (!modePick)
    {
      console.log("ERROR");
    }
    else if(modePick == MODE_REMOVE)
    {
      var threshold = getThresholdRemove();
      var mod = createModifierRemove(color, threshold);

      addStackModifier(mod);

      endModRemoveColor();
    }
    else if(modePick == MODE_RESTORE)
    {
      var threshold = getThresholdRestore();
      var mod = createModifierRestore(color, threshold);

      addStackModifier(mod);

      endModRestoreColor();
    }

    updateStackChange();

    updateButtonUndoRedo();
  }

  function createModifier(color, threshold)
  {
    return {
      "color": color,
      "threshold": threshold,
    };
  }

  function createModifierRemove(color, threshold)
  {
    var mod = createModifier(color, threshold);
    mod['mode'] = MODE_REMOVE;
    return mod;
  }

  function createModifierRestore(color, threshold)
  {
    var mod = createModifier(color, threshold);
    mod['mode'] = MODE_RESTORE;
    return mod;
  }

  function createModifierDrawText(text, font, color, align, baseline, relPosX, relPosY)
  {
    var mod = {
      mode: MODE_DRAW_TEXT,
      text: text,
      font: font,
      color: color,
      align: align,
      baseline: baseline,
      relPosX: relPosX,
      relPosY: relPosY
    };
    return mod;
  }

  function addStackModifier(mod)
  {
    if (inStackModifier(mod))
    {
      return;
    }

    stackRedo = [];
    stack.push(mod);

    updateButtonUndoRedo();
  }

  function popStackModifier()
  {
    var mod = stack.pop();
    stackRedo.push(mod);

    updateButtonUndoRedo();
  }

  function inStackModifier(mod)
  {
    for (let index = 0; index < stack.length; index++)
    {
      var m = stack[index];
      if (mod == m)
      {
        return true;
      }

      if (equal2Modifiers(m, mod))
      {
        return true;
      }
    }

    return false;
  }

  function equal2Modifiers(a, b)
  {
    // return a.threshold == b.threshold &&
    //   a.color[0] == b.color[0] &&
    //   a.color[1] == b.color[1] &&
    //   a.color[2] == b.color[2] &&
    //   a.mode == b.mode;

    // return object_equals(a, b);

    return JSON.stringify(a) === JSON.stringify(b);
  }

  function object_equals(x, y)
  {
    if (x === y) return true;
    // if both x and y are null or undefined and exactly the same

    if (!(x instanceof Object) || !(y instanceof Object)) return false;
    // if they are not strictly equal, they both need to be Objects

    if (x.constructor !== y.constructor) return false;
    // they must have the exact same prototype chain, the closest we can do is
    // test there constructor.

    for (var p in x)
    {
      if (!x.hasOwnProperty(p)) continue;
      // other properties were tested using x.constructor === y.constructor

      if (!y.hasOwnProperty(p)) return false;
      // allows to compare x[ p ] and y[ p ] when set to undefined

      if (x[p] === y[p]) continue;
      // if they have the same strict value or identity then they are equal

      if (typeof(x[p]) !== "object") return false;
      // Numbers, Strings, Functions, Booleans must be strictly equal

      if (!object_equals(x[p], y[p])) return false;
      // Objects and Arrays must be tested recursively
    }

    for (p in y)
      if (y.hasOwnProperty(p) && !x.hasOwnProperty(p))
        return false;
    // allows x[ p ] to be set to undefined

    return true;
  }

  function updateStackChange()
  {
    if (imgSrc && imgDst)
    {
      var pixels = getCanvasPixels(canvasSrc);

      pixels = processImageStackModifiers(pixels, stackPreProcess);

      var stackRemoveRestoreColor = stack.filter(function(m)
      {
        return m.mode == MODE_REMOVE || m.mode == MODE_RESTORE;
      });

      pixels = processImageStackModifiers(pixels, stackRemoveRestoreColor);

      canvasPutImage(canvasDst, pixels);

      var stackDraw = stack.filter(function(m)
      {
        return m.mode == MODE_DRAW_TEXT;
      });

      processImageStackModifiersToCanvas(canvasDst, stackDraw);
    }

    // setTimeout(function()
    // {
    //   var imageDataUrl = canvasDst.toDataURL("image/png");
    //   canvasLoadImage(imageDataUrl, canvasDst);
    // }, 100);

    if (stack.length)
    {
      setTimeout(function() {
        showDownloadImageButton();
      }, 100);
    }
  }

  function updateButtonUndoRedo()
  {
    if (stack.length)
    {
      // $('#btn-op-undo').show();
      // $('#btn-op-undo').css('visibility', 'visible');
      $('#btn-op-undo').removeAttr("disabled");
    }
    else
    {
      // $('#btn-op-undo').hide();
      // $('#btn-op-undo').css('visibility', 'hidden');
      $('#btn-op-undo').attr("disabled", true);
    }

    if (stackRedo.length)
    {
      // $('#btn-op-redo').show();
      // $('#btn-op-redo').css('visibility', 'visible');
      $('#btn-op-redo').removeAttr("disabled");
    }
    else
    {
      // $('#btn-op-redo').hide();
      // $('#btn-op-redo').css('visibility', 'hidden');
      $('#btn-op-redo').attr("disabled", true);
    }
  }

  function buttonsDisable()
  {
    $('#btn-remove-color').attr("disabled", true);
    $('#btn-restore-color').attr("disabled", true);
    $('#btn-draw-text').attr("disabled", true);

    $('#btn-remove-undo').attr("disabled", true);
    $('#btn-remove-redo').attr("disabled", true);
  }

  function buttonsEnable()
  {
    $('#btn-remove-color').removeAttr("disabled");
    $('#btn-restore-color').removeAttr("disabled");
    $('#btn-draw-text').removeAttr("disabled");

    updateButtonUndoRedo();
  }

  function startModRemoveColor()
  {
    modePick = MODE_REMOVE;

    buttonsDisable();

    colorSamplerOn();
  }

  function endModRemoveColor()
  {
    modePick = null;

    buttonsEnable();

    colorSamplerOff();
  }

  function startModRestoreColor()
  {
    modePick = MODE_RESTORE;

    buttonsDisable();

    colorSamplerOn();
  }

  function endModRestoreColor()
  {
    modePick = null;

    buttonsEnable();

    colorSamplerOff();
  }

  function getCanvasPixels(canvasEl, x, y, width, height)
  {
    x = x || 0;
    y = y || 0;

    if (!width)
    {
      width = canvasEl.width;
    }

    if (!height)
    {
      height = canvasEl.height;
    }

    var pixels = canvasEl.getContext("2d").getImageData(x, y, width, height);

    return pixels;
  }

  function processRemoveImageColorThreshold(pixels, color, threshold)
  {
    // var colorTarget = {
    //   r: parseInt(color[0]),
    //   g: parseInt(color[1]),
    //   b: parseInt(color[2])
    // };
    // console.log(colorTarget);
    // var labTarget = rgb2lab([colorTarget.r, colorTarget.g, colorTarget.b]);

    var labTarget = rgb2lab(color);

    var pixelsData = pixels.data;

    for (var i = 0, len = pixelsData.length; i < len; i += 4)
    {
      var r = pixelsData[i];
      var g = pixelsData[i + 1];
      var b = pixelsData[i + 2];
      if (pixelsData[i + 3] != 0)
      {
        var labPix = rgb2lab([r, g, b]);
        var valDelta = deltaE(labTarget, labPix)

        if (valDelta < threshold)
        {
          pixelsData[i + 3] = 0;
        }
      }
    }

    return pixels;
  }

  function processRestoreImageColorThreshold(pixels, color, threshold)
  {
    var labTarget = rgb2lab(color);

    var pixelsData = pixels.data;

    for (var i = 0, len = pixelsData.length; i < len; i += 4)
    {
      var r = pixelsData[i];
      var g = pixelsData[i + 1];
      var b = pixelsData[i + 2];
      if (pixelsData[i + 3] <= 1)
      {
        var labPix = rgb2lab([r, g, b]);
        var valDelta = deltaE(labTarget, labPix)

        if (valDelta < threshold)
        {
          pixelsData[i + 3] = 255;
        }
      }
    }

    return pixels;
  }

  function processImageModifier(pixels, mod)
  {
    var color = mod.color;
    var threshold = mod.threshold;

    var mode = mod.mode;
    if (!mode)
    {
      return pixels;
    }

    if (mode == MODE_REMOVE)
    {
      return processRemoveImageColorThreshold(pixels, color, threshold);
    }

    if (mode == MODE_RESTORE)
    {
      return processRestoreImageColorThreshold(pixels, color, threshold);
    }

    return pixels;
  }

  function processImageStackModifiers(pixels, stack)
  {
    for (let index = 0; index < stack.length; index++)
    {
      var mod = stack[index];
      pixels = processImageModifier(pixels, mod);
    }

    return pixels;
  }

  function processImageStackModifiersToCanvas(canvas, stack)
  {
    for (let index = 0; index < stack.length; index++)
    {
      var mod = stack[index];

      if (mod.mode == MODE_REMOVE || mod.mode == MODE_RESTORE)
      {
        var pixels = getCanvasPixels(canvas);
        pixels = processImageModifier(pixels, mod);
        canvasPutImage(canvasDst, pixels);
      }
      else if (mod.mode == MODE_DRAW_TEXT)
      {
        var opt = mod;
        canvasDrawText(canvas, opt);
      }
    }
  }

  function showDownloadImageButton()
  {
    var container = $('#container');
    container.html('');
    var imageDataUrl = canvasGetImageDataUrl(canvasDst);
    container.append(`<span id="og"><a id="btn-save" download="stamp.png" href='${imageDataUrl}'>⬇</a></span><br>`);
  }

  function convertImageUrlToDataUrl(url, callback)
  {
    function getDataUrl(img)
    {
      var canvas = document.createElement('canvas');
      var ctx = canvas.getContext('2d');

      canvas.width = img.width;
      canvas.height = img.height;

      ctx.drawImage(img, 0, 0);
      return canvas.toDataURL('image/jpeg');
    }

    var img = document.createElement('img');
    img.src = url;
    img.addEventListener('load', function(event)
    {
      const dataUrl = getDataUrl(event.currentTarget);
      callback(dataUrl);
    });
  }

  setTimeout(function()
  {
    // $('#table-images').css('visibility', 'visible');
    // $('#controls').css('visibility', 'visible');

    // init("./res/sample.png");
    // setTimeout(function()
    // {
    //   var imageDataUrl = canvasSrc.toDataURL("image/png");
    //   init(imageDataUrl);
    // }, 100);

    // (async function()
    // {
    //   let blob = await fetch("./res/sample.png").then(r => r.blob());
    //   let dataUrl = await new Promise(resolve =>
    //   {
    //     let reader = new FileReader();
    //     reader.onload = () => resolve(reader.result);
    //     reader.readAsDataURL(blob);
    //   });

    //   $('#table-images').css('visibility', 'visible');
    //   $('#controls').css('visibility', 'visible');

    //   init(dataUrl);
    // })();

    convertImageUrlToDataUrl('./res/sample.png', function(dataUrl)
    {
      $('#table-images').css('visibility', 'visible');
      $('#controls').css('visibility', 'visible');

      init(dataUrl);
    });

  }, 100);

});
