(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var glmatrix = require('gl-matrix');
var svs  = require('./shader/vertex.c');
var sfs  = require('./shader/fragment.c');
var OBJ = require('webgl-obj-loader');

var app = {};
app.meshes = {};
app.models = {};
app.mvMatrix = glmatrix.mat4.create();
app.mvMatrixStack = [];
app.pMatrix = glmatrix.mat4.create();

// const { mat4, mat3, vec3 } = glMatrix;

const createMeshes = () => {
    var objStr = document.getElementById('my_cube.obj').innerHTML;
    var newMesh = new OBJ.Mesh(objStr);
    var meshes = { my_cube: newMesh };
    app.meshes = meshes;
}

window.onload = () => {
    createMeshes();
    webGLInitialize().then( (programContext) => {
        initShadersAndBuffers(programContext);
        drawScene(programContext);
    });
}

// Get A WebGL context
const getCanvas = (parent) => {
    var canvas = document.createElement('canvas');
    canvas.setAttribute('id', 'glcanvas');
    canvas.setAttribute('width', '400');
    canvas.setAttribute('height', '400');
    parent.appendChild(canvas);
    
    var gl = canvas.getContext('webgl');
    return { canvas: canvas, gl : gl }
};

// Initialize WebGL context with shaders
const webGLInitialize = () => {

    // Get reference to canvas
    var body = document.getElementsByTagName('body')[0];
    var glcontext = getCanvas(body);
    var gl = glcontext.gl;

    // Create vertex and fragment shaders
    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, svs());
    gl.compileShader(vertexShader);
    
    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, sfs());
    gl.compileShader(fragmentShader);

    var success = gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS);
    if (success) {
        console.log("Shader successfully compiled");
        console.log(gl.getShaderInfoLog(fragmentShader));
    } else {
        console.log("Shader not compiled...")
    }
    
    // Link shaders to created gl program
    var shaders = [vertexShader, fragmentShader];
    var program = gl.createProgram();
    shaders.forEach( (shader) => {
        gl.attachShader(program, shader);
    });
    gl.linkProgram(program);
    var success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
        console.log("Successfully linked.");
    }
    
    return new Promise ((resolve, reject) => {
        if (!gl) return reject("WebGL initialization failed.");
        resolve({ 
            gl: gl,
            program: program
        });
    });
}

const setMatrixUniforms = (programContext) => {

    var gl = programContext.gl;
    var program = programContext.program;

    gl.uniformMatrix4fv(program.pMatrixUniform, false, app.pMatrix);
    gl.uniformMatrix4fv(program.mvMatrixUniform, false, app.mvMatrix);

    // To transform normals, we need to find the transpose of
    // the inverse of the ModelView matrix
    var normalMatrix = glmatrix.mat3.create();
    var mvMatrixMat3 = glmatrix.mat3.create();
    glmatrix.mat3.fromMat4(mvMatrixMat3, app.mvMatrix);
    glmatrix.mat3.invert(normalMatrix, mvMatrixMat3);
    glmatrix.mat3.transpose(normalMatrix, normalMatrix);
    
    // glmatrix.mat4.toInverseMat3(app.mvMatrix, normalMatrix);
    gl.uniformMatrix3fv(program.nMatrixUniform, false, normalMatrix);
}

const initShadersAndBuffers = (programContext) => {

    var gl = programContext.gl;
    var program = programContext.program;

    console.log(gl);
    gl.useProgram(program);

    // Attach attributes to the shader program
    program.vertexPositionAttribute = gl.getAttribLocation(program, "aVertexPosition");
    gl.enableVertexAttribArray(program.vertexPositionAttribute);
    
    program.vertexNormalAttribute = gl.getAttribLocation(program, "aVertexNormal");
    gl.enableVertexAttribArray(program.vertexNormalAttribute);
    
    program.textureCoordAttribute = gl.getAttribLocation(program, "aTextureCoord");
    gl.enableVertexAttribArray(program.textureCoordAttribute);

    program.pMatrixUniform = gl.getUniformLocation(program, "uPMatrix");
    program.mvMatrixUniform = gl.getUniformLocation(program, "uMVMatrix");
    program.nMatrixUniform = gl.getUniformLocation(program, "uNMatrix");
    
    for (var mesh in app.meshes) {
        // Initialize the VBOs
        OBJ.initMeshBuffers(gl, app.meshes[mesh]);
        app.models[mesh] = {};
        app.models[mesh].mesh = app.meshes[mesh];
    }
}

const drawObject = (programContext, model) => {

    var gl = programContext.gl;
    var program = programContext.program;

    console.log(model);
    console.log(model.mesh.vertexBuffer.itemSize);
    console.log(model.mesh.normalBuffer.itemSize);
    console.log(model.mesh.textureBuffer.itemSize);

    // Bind buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, model.mesh.vertexBuffer);
    gl.vertexAttribPointer(program.vertexPositionAttribute, model.mesh.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, model.mesh.normalBuffer);
    gl.vertexAttribPointer(program.vertexNormalAttribute, model.mesh.normalBuffer.itemSize, gl.FLOAT, false, 0, 0);

    if (model.mesh.textures.length) {
        gl.enableVertexAttribArray(program.textureCoordAttribute);
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.textureBuffer);
        gl.vertexAttribPointer(program.textureCoordAttribute, mesh.textureBuffer.itemSize, gl.FLOAT, false, 0, 0);
    }
    else {
        gl.disableVertexAttribArray(program.textureCoordAttribute);
    }
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.mesh.indexBuffer);
    setMatrixUniforms(programContext); 
    gl.drawElements(gl.TRIANGLES, model.mesh.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    
};

const drawScene = (programContext) => {
    
    var gl = programContext.gl;

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    glmatrix.mat4.perspective(app.pMatrix, 45, gl.viewportWidth / gl.viewportHeight, 0.01, 1000.0);
    // glmatrix.mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.01, 1000.0, app.pMatrix);
    glmatrix.mat4.identity(app.mvMatrix);
    // move the camera
    glmatrix.mat4.translate(app.pMatrix, app.mvMatrix, [0, 0, -5]);
    // set up the scene
    //mvPushMatrix();
    drawObject(programContext, app.models.my_cube);
    //mvPopMatrix();
}

function mvPushMatrix() {
    var copy = glmatrix.mat4.create();
    glmatrix.mat4.set(app.mvMatrix, copy);
    app.mvMatrixStack.push(copy);
}

function mvPopMatrix(){
    if (app.mvMatrixStack.length == 0){
        throw "Invalid popMatrix!";
    }
    app.mvMatrix = app.mvMatrixStack.pop();
}

},{"./shader/fragment.c":14,"./shader/vertex.c":15,"gl-matrix":3,"webgl-obj-loader":13}],2:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.setMatrixArrayType = setMatrixArrayType;
exports.toRadian = toRadian;
exports.equals = equals;
exports.RANDOM = exports.ARRAY_TYPE = exports.EPSILON = void 0;

/**
 * Common utilities
 * @module glMatrix
 */
// Configuration Constants
var EPSILON = 0.000001;
exports.EPSILON = EPSILON;
var ARRAY_TYPE = typeof Float32Array !== 'undefined' ? Float32Array : Array;
exports.ARRAY_TYPE = ARRAY_TYPE;
var RANDOM = Math.random;
/**
 * Sets the type of array used when creating new vectors and matrices
 *
 * @param {Type} type Array type, such as Float32Array or Array
 */

exports.RANDOM = RANDOM;

function setMatrixArrayType(type) {
  exports.ARRAY_TYPE = ARRAY_TYPE = type;
}

var degree = Math.PI / 180;
/**
 * Convert Degree To Radian
 *
 * @param {Number} a Angle in Degrees
 */

function toRadian(a) {
  return a * degree;
}
/**
 * Tests whether or not the arguments have approximately the same value, within an absolute
 * or relative tolerance of glMatrix.EPSILON (an absolute tolerance is used for values less
 * than or equal to 1.0, and a relative tolerance is used for larger values)
 *
 * @param {Number} a The first number to test.
 * @param {Number} b The second number to test.
 * @returns {Boolean} True if the numbers are approximately equal, false otherwise.
 */


function equals(a, b) {
  return Math.abs(a - b) <= EPSILON * Math.max(1.0, Math.abs(a), Math.abs(b));
}

if (!Math.hypot) Math.hypot = function () {
  var y = 0,
      i = arguments.length;

  while (i--) {
    y += arguments[i] * arguments[i];
  }

  return Math.sqrt(y);
};
},{}],3:[function(require,module,exports){
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.vec4 = exports.vec3 = exports.vec2 = exports.quat2 = exports.quat = exports.mat4 = exports.mat3 = exports.mat2d = exports.mat2 = exports.glMatrix = void 0;

var glMatrix = _interopRequireWildcard(require("./common.js"));

exports.glMatrix = glMatrix;

var mat2 = _interopRequireWildcard(require("./mat2.js"));

exports.mat2 = mat2;

var mat2d = _interopRequireWildcard(require("./mat2d.js"));

exports.mat2d = mat2d;

var mat3 = _interopRequireWildcard(require("./mat3.js"));

exports.mat3 = mat3;

var mat4 = _interopRequireWildcard(require("./mat4.js"));

exports.mat4 = mat4;

var quat = _interopRequireWildcard(require("./quat.js"));

exports.quat = quat;

var quat2 = _interopRequireWildcard(require("./quat2.js"));

exports.quat2 = quat2;

var vec2 = _interopRequireWildcard(require("./vec2.js"));

exports.vec2 = vec2;

var vec3 = _interopRequireWildcard(require("./vec3.js"));

exports.vec3 = vec3;

var vec4 = _interopRequireWildcard(require("./vec4.js"));

exports.vec4 = vec4;

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function _getRequireWildcardCache() { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
},{"./common.js":2,"./mat2.js":4,"./mat2d.js":5,"./mat3.js":6,"./mat4.js":7,"./quat.js":8,"./quat2.js":9,"./vec2.js":10,"./vec3.js":11,"./vec4.js":12}],4:[function(require,module,exports){
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.create = create;
exports.clone = clone;
exports.copy = copy;
exports.identity = identity;
exports.fromValues = fromValues;
exports.set = set;
exports.transpose = transpose;
exports.invert = invert;
exports.adjoint = adjoint;
exports.determinant = determinant;
exports.multiply = multiply;
exports.rotate = rotate;
exports.scale = scale;
exports.fromRotation = fromRotation;
exports.fromScaling = fromScaling;
exports.str = str;
exports.frob = frob;
exports.LDU = LDU;
exports.add = add;
exports.subtract = subtract;
exports.exactEquals = exactEquals;
exports.equals = equals;
exports.multiplyScalar = multiplyScalar;
exports.multiplyScalarAndAdd = multiplyScalarAndAdd;
exports.sub = exports.mul = void 0;

var glMatrix = _interopRequireWildcard(require("./common.js"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function _getRequireWildcardCache() { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

/**
 * 2x2 Matrix
 * @module mat2
 */

/**
 * Creates a new identity mat2
 *
 * @returns {mat2} a new 2x2 matrix
 */
function create() {
  var out = new glMatrix.ARRAY_TYPE(4);

  if (glMatrix.ARRAY_TYPE != Float32Array) {
    out[1] = 0;
    out[2] = 0;
  }

  out[0] = 1;
  out[3] = 1;
  return out;
}
/**
 * Creates a new mat2 initialized with values from an existing matrix
 *
 * @param {mat2} a matrix to clone
 * @returns {mat2} a new 2x2 matrix
 */


function clone(a) {
  var out = new glMatrix.ARRAY_TYPE(4);
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  return out;
}
/**
 * Copy the values from one mat2 to another
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the source matrix
 * @returns {mat2} out
 */


function copy(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  return out;
}
/**
 * Set a mat2 to the identity matrix
 *
 * @param {mat2} out the receiving matrix
 * @returns {mat2} out
 */


function identity(out) {
  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 1;
  return out;
}
/**
 * Create a new mat2 with the given values
 *
 * @param {Number} m00 Component in column 0, row 0 position (index 0)
 * @param {Number} m01 Component in column 0, row 1 position (index 1)
 * @param {Number} m10 Component in column 1, row 0 position (index 2)
 * @param {Number} m11 Component in column 1, row 1 position (index 3)
 * @returns {mat2} out A new 2x2 matrix
 */


function fromValues(m00, m01, m10, m11) {
  var out = new glMatrix.ARRAY_TYPE(4);
  out[0] = m00;
  out[1] = m01;
  out[2] = m10;
  out[3] = m11;
  return out;
}
/**
 * Set the components of a mat2 to the given values
 *
 * @param {mat2} out the receiving matrix
 * @param {Number} m00 Component in column 0, row 0 position (index 0)
 * @param {Number} m01 Component in column 0, row 1 position (index 1)
 * @param {Number} m10 Component in column 1, row 0 position (index 2)
 * @param {Number} m11 Component in column 1, row 1 position (index 3)
 * @returns {mat2} out
 */


function set(out, m00, m01, m10, m11) {
  out[0] = m00;
  out[1] = m01;
  out[2] = m10;
  out[3] = m11;
  return out;
}
/**
 * Transpose the values of a mat2
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the source matrix
 * @returns {mat2} out
 */


function transpose(out, a) {
  // If we are transposing ourselves we can skip a few steps but have to cache
  // some values
  if (out === a) {
    var a1 = a[1];
    out[1] = a[2];
    out[2] = a1;
  } else {
    out[0] = a[0];
    out[1] = a[2];
    out[2] = a[1];
    out[3] = a[3];
  }

  return out;
}
/**
 * Inverts a mat2
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the source matrix
 * @returns {mat2} out
 */


function invert(out, a) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3]; // Calculate the determinant

  var det = a0 * a3 - a2 * a1;

  if (!det) {
    return null;
  }

  det = 1.0 / det;
  out[0] = a3 * det;
  out[1] = -a1 * det;
  out[2] = -a2 * det;
  out[3] = a0 * det;
  return out;
}
/**
 * Calculates the adjugate of a mat2
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the source matrix
 * @returns {mat2} out
 */


function adjoint(out, a) {
  // Caching this value is nessecary if out == a
  var a0 = a[0];
  out[0] = a[3];
  out[1] = -a[1];
  out[2] = -a[2];
  out[3] = a0;
  return out;
}
/**
 * Calculates the determinant of a mat2
 *
 * @param {mat2} a the source matrix
 * @returns {Number} determinant of a
 */


function determinant(a) {
  return a[0] * a[3] - a[2] * a[1];
}
/**
 * Multiplies two mat2's
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the first operand
 * @param {mat2} b the second operand
 * @returns {mat2} out
 */


function multiply(out, a, b) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3];
  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3];
  out[0] = a0 * b0 + a2 * b1;
  out[1] = a1 * b0 + a3 * b1;
  out[2] = a0 * b2 + a2 * b3;
  out[3] = a1 * b2 + a3 * b3;
  return out;
}
/**
 * Rotates a mat2 by the given angle
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat2} out
 */


function rotate(out, a, rad) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3];
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  out[0] = a0 * c + a2 * s;
  out[1] = a1 * c + a3 * s;
  out[2] = a0 * -s + a2 * c;
  out[3] = a1 * -s + a3 * c;
  return out;
}
/**
 * Scales the mat2 by the dimensions in the given vec2
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the matrix to rotate
 * @param {vec2} v the vec2 to scale the matrix by
 * @returns {mat2} out
 **/


function scale(out, a, v) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3];
  var v0 = v[0],
      v1 = v[1];
  out[0] = a0 * v0;
  out[1] = a1 * v0;
  out[2] = a2 * v1;
  out[3] = a3 * v1;
  return out;
}
/**
 * Creates a matrix from a given angle
 * This is equivalent to (but much faster than):
 *
 *     mat2.identity(dest);
 *     mat2.rotate(dest, dest, rad);
 *
 * @param {mat2} out mat2 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat2} out
 */


function fromRotation(out, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  out[0] = c;
  out[1] = s;
  out[2] = -s;
  out[3] = c;
  return out;
}
/**
 * Creates a matrix from a vector scaling
 * This is equivalent to (but much faster than):
 *
 *     mat2.identity(dest);
 *     mat2.scale(dest, dest, vec);
 *
 * @param {mat2} out mat2 receiving operation result
 * @param {vec2} v Scaling vector
 * @returns {mat2} out
 */


function fromScaling(out, v) {
  out[0] = v[0];
  out[1] = 0;
  out[2] = 0;
  out[3] = v[1];
  return out;
}
/**
 * Returns a string representation of a mat2
 *
 * @param {mat2} a matrix to represent as a string
 * @returns {String} string representation of the matrix
 */


function str(a) {
  return "mat2(" + a[0] + ", " + a[1] + ", " + a[2] + ", " + a[3] + ")";
}
/**
 * Returns Frobenius norm of a mat2
 *
 * @param {mat2} a the matrix to calculate Frobenius norm of
 * @returns {Number} Frobenius norm
 */


function frob(a) {
  return Math.hypot(a[0], a[1], a[2], a[3]);
}
/**
 * Returns L, D and U matrices (Lower triangular, Diagonal and Upper triangular) by factorizing the input matrix
 * @param {mat2} L the lower triangular matrix
 * @param {mat2} D the diagonal matrix
 * @param {mat2} U the upper triangular matrix
 * @param {mat2} a the input matrix to factorize
 */


function LDU(L, D, U, a) {
  L[2] = a[2] / a[0];
  U[0] = a[0];
  U[1] = a[1];
  U[3] = a[3] - L[2] * U[1];
  return [L, D, U];
}
/**
 * Adds two mat2's
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the first operand
 * @param {mat2} b the second operand
 * @returns {mat2} out
 */


function add(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  out[3] = a[3] + b[3];
  return out;
}
/**
 * Subtracts matrix b from matrix a
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the first operand
 * @param {mat2} b the second operand
 * @returns {mat2} out
 */


function subtract(out, a, b) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  out[3] = a[3] - b[3];
  return out;
}
/**
 * Returns whether or not the matrices have exactly the same elements in the same position (when compared with ===)
 *
 * @param {mat2} a The first matrix.
 * @param {mat2} b The second matrix.
 * @returns {Boolean} True if the matrices are equal, false otherwise.
 */


function exactEquals(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}
/**
 * Returns whether or not the matrices have approximately the same elements in the same position.
 *
 * @param {mat2} a The first matrix.
 * @param {mat2} b The second matrix.
 * @returns {Boolean} True if the matrices are equal, false otherwise.
 */


function equals(a, b) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3];
  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3];
  return Math.abs(a0 - b0) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a3), Math.abs(b3));
}
/**
 * Multiply each element of the matrix by a scalar.
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the matrix to scale
 * @param {Number} b amount to scale the matrix's elements by
 * @returns {mat2} out
 */


function multiplyScalar(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  out[2] = a[2] * b;
  out[3] = a[3] * b;
  return out;
}
/**
 * Adds two mat2's after multiplying each element of the second operand by a scalar value.
 *
 * @param {mat2} out the receiving vector
 * @param {mat2} a the first operand
 * @param {mat2} b the second operand
 * @param {Number} scale the amount to scale b's elements by before adding
 * @returns {mat2} out
 */


function multiplyScalarAndAdd(out, a, b, scale) {
  out[0] = a[0] + b[0] * scale;
  out[1] = a[1] + b[1] * scale;
  out[2] = a[2] + b[2] * scale;
  out[3] = a[3] + b[3] * scale;
  return out;
}
/**
 * Alias for {@link mat2.multiply}
 * @function
 */


var mul = multiply;
/**
 * Alias for {@link mat2.subtract}
 * @function
 */

exports.mul = mul;
var sub = subtract;
exports.sub = sub;
},{"./common.js":2}],5:[function(require,module,exports){
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.create = create;
exports.clone = clone;
exports.copy = copy;
exports.identity = identity;
exports.fromValues = fromValues;
exports.set = set;
exports.invert = invert;
exports.determinant = determinant;
exports.multiply = multiply;
exports.rotate = rotate;
exports.scale = scale;
exports.translate = translate;
exports.fromRotation = fromRotation;
exports.fromScaling = fromScaling;
exports.fromTranslation = fromTranslation;
exports.str = str;
exports.frob = frob;
exports.add = add;
exports.subtract = subtract;
exports.multiplyScalar = multiplyScalar;
exports.multiplyScalarAndAdd = multiplyScalarAndAdd;
exports.exactEquals = exactEquals;
exports.equals = equals;
exports.sub = exports.mul = void 0;

var glMatrix = _interopRequireWildcard(require("./common.js"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function _getRequireWildcardCache() { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

/**
 * 2x3 Matrix
 * @module mat2d
 * @description
 * A mat2d contains six elements defined as:
 * <pre>
 * [a, b,
 *  c, d,
 *  tx, ty]
 * </pre>
 * This is a short form for the 3x3 matrix:
 * <pre>
 * [a, b, 0,
 *  c, d, 0,
 *  tx, ty, 1]
 * </pre>
 * The last column is ignored so the array is shorter and operations are faster.
 */

/**
 * Creates a new identity mat2d
 *
 * @returns {mat2d} a new 2x3 matrix
 */
function create() {
  var out = new glMatrix.ARRAY_TYPE(6);

  if (glMatrix.ARRAY_TYPE != Float32Array) {
    out[1] = 0;
    out[2] = 0;
    out[4] = 0;
    out[5] = 0;
  }

  out[0] = 1;
  out[3] = 1;
  return out;
}
/**
 * Creates a new mat2d initialized with values from an existing matrix
 *
 * @param {mat2d} a matrix to clone
 * @returns {mat2d} a new 2x3 matrix
 */


function clone(a) {
  var out = new glMatrix.ARRAY_TYPE(6);
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  out[4] = a[4];
  out[5] = a[5];
  return out;
}
/**
 * Copy the values from one mat2d to another
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the source matrix
 * @returns {mat2d} out
 */


function copy(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  out[4] = a[4];
  out[5] = a[5];
  return out;
}
/**
 * Set a mat2d to the identity matrix
 *
 * @param {mat2d} out the receiving matrix
 * @returns {mat2d} out
 */


function identity(out) {
  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 1;
  out[4] = 0;
  out[5] = 0;
  return out;
}
/**
 * Create a new mat2d with the given values
 *
 * @param {Number} a Component A (index 0)
 * @param {Number} b Component B (index 1)
 * @param {Number} c Component C (index 2)
 * @param {Number} d Component D (index 3)
 * @param {Number} tx Component TX (index 4)
 * @param {Number} ty Component TY (index 5)
 * @returns {mat2d} A new mat2d
 */


function fromValues(a, b, c, d, tx, ty) {
  var out = new glMatrix.ARRAY_TYPE(6);
  out[0] = a;
  out[1] = b;
  out[2] = c;
  out[3] = d;
  out[4] = tx;
  out[5] = ty;
  return out;
}
/**
 * Set the components of a mat2d to the given values
 *
 * @param {mat2d} out the receiving matrix
 * @param {Number} a Component A (index 0)
 * @param {Number} b Component B (index 1)
 * @param {Number} c Component C (index 2)
 * @param {Number} d Component D (index 3)
 * @param {Number} tx Component TX (index 4)
 * @param {Number} ty Component TY (index 5)
 * @returns {mat2d} out
 */


function set(out, a, b, c, d, tx, ty) {
  out[0] = a;
  out[1] = b;
  out[2] = c;
  out[3] = d;
  out[4] = tx;
  out[5] = ty;
  return out;
}
/**
 * Inverts a mat2d
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the source matrix
 * @returns {mat2d} out
 */


function invert(out, a) {
  var aa = a[0],
      ab = a[1],
      ac = a[2],
      ad = a[3];
  var atx = a[4],
      aty = a[5];
  var det = aa * ad - ab * ac;

  if (!det) {
    return null;
  }

  det = 1.0 / det;
  out[0] = ad * det;
  out[1] = -ab * det;
  out[2] = -ac * det;
  out[3] = aa * det;
  out[4] = (ac * aty - ad * atx) * det;
  out[5] = (ab * atx - aa * aty) * det;
  return out;
}
/**
 * Calculates the determinant of a mat2d
 *
 * @param {mat2d} a the source matrix
 * @returns {Number} determinant of a
 */


function determinant(a) {
  return a[0] * a[3] - a[1] * a[2];
}
/**
 * Multiplies two mat2d's
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the first operand
 * @param {mat2d} b the second operand
 * @returns {mat2d} out
 */


function multiply(out, a, b) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3],
      a4 = a[4],
      a5 = a[5];
  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3],
      b4 = b[4],
      b5 = b[5];
  out[0] = a0 * b0 + a2 * b1;
  out[1] = a1 * b0 + a3 * b1;
  out[2] = a0 * b2 + a2 * b3;
  out[3] = a1 * b2 + a3 * b3;
  out[4] = a0 * b4 + a2 * b5 + a4;
  out[5] = a1 * b4 + a3 * b5 + a5;
  return out;
}
/**
 * Rotates a mat2d by the given angle
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat2d} out
 */


function rotate(out, a, rad) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3],
      a4 = a[4],
      a5 = a[5];
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  out[0] = a0 * c + a2 * s;
  out[1] = a1 * c + a3 * s;
  out[2] = a0 * -s + a2 * c;
  out[3] = a1 * -s + a3 * c;
  out[4] = a4;
  out[5] = a5;
  return out;
}
/**
 * Scales the mat2d by the dimensions in the given vec2
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the matrix to translate
 * @param {vec2} v the vec2 to scale the matrix by
 * @returns {mat2d} out
 **/


function scale(out, a, v) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3],
      a4 = a[4],
      a5 = a[5];
  var v0 = v[0],
      v1 = v[1];
  out[0] = a0 * v0;
  out[1] = a1 * v0;
  out[2] = a2 * v1;
  out[3] = a3 * v1;
  out[4] = a4;
  out[5] = a5;
  return out;
}
/**
 * Translates the mat2d by the dimensions in the given vec2
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the matrix to translate
 * @param {vec2} v the vec2 to translate the matrix by
 * @returns {mat2d} out
 **/


function translate(out, a, v) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3],
      a4 = a[4],
      a5 = a[5];
  var v0 = v[0],
      v1 = v[1];
  out[0] = a0;
  out[1] = a1;
  out[2] = a2;
  out[3] = a3;
  out[4] = a0 * v0 + a2 * v1 + a4;
  out[5] = a1 * v0 + a3 * v1 + a5;
  return out;
}
/**
 * Creates a matrix from a given angle
 * This is equivalent to (but much faster than):
 *
 *     mat2d.identity(dest);
 *     mat2d.rotate(dest, dest, rad);
 *
 * @param {mat2d} out mat2d receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat2d} out
 */


function fromRotation(out, rad) {
  var s = Math.sin(rad),
      c = Math.cos(rad);
  out[0] = c;
  out[1] = s;
  out[2] = -s;
  out[3] = c;
  out[4] = 0;
  out[5] = 0;
  return out;
}
/**
 * Creates a matrix from a vector scaling
 * This is equivalent to (but much faster than):
 *
 *     mat2d.identity(dest);
 *     mat2d.scale(dest, dest, vec);
 *
 * @param {mat2d} out mat2d receiving operation result
 * @param {vec2} v Scaling vector
 * @returns {mat2d} out
 */


function fromScaling(out, v) {
  out[0] = v[0];
  out[1] = 0;
  out[2] = 0;
  out[3] = v[1];
  out[4] = 0;
  out[5] = 0;
  return out;
}
/**
 * Creates a matrix from a vector translation
 * This is equivalent to (but much faster than):
 *
 *     mat2d.identity(dest);
 *     mat2d.translate(dest, dest, vec);
 *
 * @param {mat2d} out mat2d receiving operation result
 * @param {vec2} v Translation vector
 * @returns {mat2d} out
 */


function fromTranslation(out, v) {
  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 1;
  out[4] = v[0];
  out[5] = v[1];
  return out;
}
/**
 * Returns a string representation of a mat2d
 *
 * @param {mat2d} a matrix to represent as a string
 * @returns {String} string representation of the matrix
 */


function str(a) {
  return "mat2d(" + a[0] + ", " + a[1] + ", " + a[2] + ", " + a[3] + ", " + a[4] + ", " + a[5] + ")";
}
/**
 * Returns Frobenius norm of a mat2d
 *
 * @param {mat2d} a the matrix to calculate Frobenius norm of
 * @returns {Number} Frobenius norm
 */


function frob(a) {
  return Math.hypot(a[0], a[1], a[2], a[3], a[4], a[5], 1);
}
/**
 * Adds two mat2d's
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the first operand
 * @param {mat2d} b the second operand
 * @returns {mat2d} out
 */


function add(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  out[3] = a[3] + b[3];
  out[4] = a[4] + b[4];
  out[5] = a[5] + b[5];
  return out;
}
/**
 * Subtracts matrix b from matrix a
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the first operand
 * @param {mat2d} b the second operand
 * @returns {mat2d} out
 */


function subtract(out, a, b) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  out[3] = a[3] - b[3];
  out[4] = a[4] - b[4];
  out[5] = a[5] - b[5];
  return out;
}
/**
 * Multiply each element of the matrix by a scalar.
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the matrix to scale
 * @param {Number} b amount to scale the matrix's elements by
 * @returns {mat2d} out
 */


function multiplyScalar(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  out[2] = a[2] * b;
  out[3] = a[3] * b;
  out[4] = a[4] * b;
  out[5] = a[5] * b;
  return out;
}
/**
 * Adds two mat2d's after multiplying each element of the second operand by a scalar value.
 *
 * @param {mat2d} out the receiving vector
 * @param {mat2d} a the first operand
 * @param {mat2d} b the second operand
 * @param {Number} scale the amount to scale b's elements by before adding
 * @returns {mat2d} out
 */


function multiplyScalarAndAdd(out, a, b, scale) {
  out[0] = a[0] + b[0] * scale;
  out[1] = a[1] + b[1] * scale;
  out[2] = a[2] + b[2] * scale;
  out[3] = a[3] + b[3] * scale;
  out[4] = a[4] + b[4] * scale;
  out[5] = a[5] + b[5] * scale;
  return out;
}
/**
 * Returns whether or not the matrices have exactly the same elements in the same position (when compared with ===)
 *
 * @param {mat2d} a The first matrix.
 * @param {mat2d} b The second matrix.
 * @returns {Boolean} True if the matrices are equal, false otherwise.
 */


function exactEquals(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3] && a[4] === b[4] && a[5] === b[5];
}
/**
 * Returns whether or not the matrices have approximately the same elements in the same position.
 *
 * @param {mat2d} a The first matrix.
 * @param {mat2d} b The second matrix.
 * @returns {Boolean} True if the matrices are equal, false otherwise.
 */


function equals(a, b) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3],
      a4 = a[4],
      a5 = a[5];
  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3],
      b4 = b[4],
      b5 = b[5];
  return Math.abs(a0 - b0) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a3), Math.abs(b3)) && Math.abs(a4 - b4) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a4), Math.abs(b4)) && Math.abs(a5 - b5) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a5), Math.abs(b5));
}
/**
 * Alias for {@link mat2d.multiply}
 * @function
 */


var mul = multiply;
/**
 * Alias for {@link mat2d.subtract}
 * @function
 */

exports.mul = mul;
var sub = subtract;
exports.sub = sub;
},{"./common.js":2}],6:[function(require,module,exports){
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.create = create;
exports.fromMat4 = fromMat4;
exports.clone = clone;
exports.copy = copy;
exports.fromValues = fromValues;
exports.set = set;
exports.identity = identity;
exports.transpose = transpose;
exports.invert = invert;
exports.adjoint = adjoint;
exports.determinant = determinant;
exports.multiply = multiply;
exports.translate = translate;
exports.rotate = rotate;
exports.scale = scale;
exports.fromTranslation = fromTranslation;
exports.fromRotation = fromRotation;
exports.fromScaling = fromScaling;
exports.fromMat2d = fromMat2d;
exports.fromQuat = fromQuat;
exports.normalFromMat4 = normalFromMat4;
exports.projection = projection;
exports.str = str;
exports.frob = frob;
exports.add = add;
exports.subtract = subtract;
exports.multiplyScalar = multiplyScalar;
exports.multiplyScalarAndAdd = multiplyScalarAndAdd;
exports.exactEquals = exactEquals;
exports.equals = equals;
exports.sub = exports.mul = void 0;

var glMatrix = _interopRequireWildcard(require("./common.js"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function _getRequireWildcardCache() { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

/**
 * 3x3 Matrix
 * @module mat3
 */

/**
 * Creates a new identity mat3
 *
 * @returns {mat3} a new 3x3 matrix
 */
function create() {
  var out = new glMatrix.ARRAY_TYPE(9);

  if (glMatrix.ARRAY_TYPE != Float32Array) {
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
  }

  out[0] = 1;
  out[4] = 1;
  out[8] = 1;
  return out;
}
/**
 * Copies the upper-left 3x3 values into the given mat3.
 *
 * @param {mat3} out the receiving 3x3 matrix
 * @param {mat4} a   the source 4x4 matrix
 * @returns {mat3} out
 */


function fromMat4(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[4];
  out[4] = a[5];
  out[5] = a[6];
  out[6] = a[8];
  out[7] = a[9];
  out[8] = a[10];
  return out;
}
/**
 * Creates a new mat3 initialized with values from an existing matrix
 *
 * @param {mat3} a matrix to clone
 * @returns {mat3} a new 3x3 matrix
 */


function clone(a) {
  var out = new glMatrix.ARRAY_TYPE(9);
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  out[4] = a[4];
  out[5] = a[5];
  out[6] = a[6];
  out[7] = a[7];
  out[8] = a[8];
  return out;
}
/**
 * Copy the values from one mat3 to another
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the source matrix
 * @returns {mat3} out
 */


function copy(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  out[4] = a[4];
  out[5] = a[5];
  out[6] = a[6];
  out[7] = a[7];
  out[8] = a[8];
  return out;
}
/**
 * Create a new mat3 with the given values
 *
 * @param {Number} m00 Component in column 0, row 0 position (index 0)
 * @param {Number} m01 Component in column 0, row 1 position (index 1)
 * @param {Number} m02 Component in column 0, row 2 position (index 2)
 * @param {Number} m10 Component in column 1, row 0 position (index 3)
 * @param {Number} m11 Component in column 1, row 1 position (index 4)
 * @param {Number} m12 Component in column 1, row 2 position (index 5)
 * @param {Number} m20 Component in column 2, row 0 position (index 6)
 * @param {Number} m21 Component in column 2, row 1 position (index 7)
 * @param {Number} m22 Component in column 2, row 2 position (index 8)
 * @returns {mat3} A new mat3
 */


function fromValues(m00, m01, m02, m10, m11, m12, m20, m21, m22) {
  var out = new glMatrix.ARRAY_TYPE(9);
  out[0] = m00;
  out[1] = m01;
  out[2] = m02;
  out[3] = m10;
  out[4] = m11;
  out[5] = m12;
  out[6] = m20;
  out[7] = m21;
  out[8] = m22;
  return out;
}
/**
 * Set the components of a mat3 to the given values
 *
 * @param {mat3} out the receiving matrix
 * @param {Number} m00 Component in column 0, row 0 position (index 0)
 * @param {Number} m01 Component in column 0, row 1 position (index 1)
 * @param {Number} m02 Component in column 0, row 2 position (index 2)
 * @param {Number} m10 Component in column 1, row 0 position (index 3)
 * @param {Number} m11 Component in column 1, row 1 position (index 4)
 * @param {Number} m12 Component in column 1, row 2 position (index 5)
 * @param {Number} m20 Component in column 2, row 0 position (index 6)
 * @param {Number} m21 Component in column 2, row 1 position (index 7)
 * @param {Number} m22 Component in column 2, row 2 position (index 8)
 * @returns {mat3} out
 */


function set(out, m00, m01, m02, m10, m11, m12, m20, m21, m22) {
  out[0] = m00;
  out[1] = m01;
  out[2] = m02;
  out[3] = m10;
  out[4] = m11;
  out[5] = m12;
  out[6] = m20;
  out[7] = m21;
  out[8] = m22;
  return out;
}
/**
 * Set a mat3 to the identity matrix
 *
 * @param {mat3} out the receiving matrix
 * @returns {mat3} out
 */


function identity(out) {
  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 1;
  out[5] = 0;
  out[6] = 0;
  out[7] = 0;
  out[8] = 1;
  return out;
}
/**
 * Transpose the values of a mat3
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the source matrix
 * @returns {mat3} out
 */


function transpose(out, a) {
  // If we are transposing ourselves we can skip a few steps but have to cache some values
  if (out === a) {
    var a01 = a[1],
        a02 = a[2],
        a12 = a[5];
    out[1] = a[3];
    out[2] = a[6];
    out[3] = a01;
    out[5] = a[7];
    out[6] = a02;
    out[7] = a12;
  } else {
    out[0] = a[0];
    out[1] = a[3];
    out[2] = a[6];
    out[3] = a[1];
    out[4] = a[4];
    out[5] = a[7];
    out[6] = a[2];
    out[7] = a[5];
    out[8] = a[8];
  }

  return out;
}
/**
 * Inverts a mat3
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the source matrix
 * @returns {mat3} out
 */


function invert(out, a) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2];
  var a10 = a[3],
      a11 = a[4],
      a12 = a[5];
  var a20 = a[6],
      a21 = a[7],
      a22 = a[8];
  var b01 = a22 * a11 - a12 * a21;
  var b11 = -a22 * a10 + a12 * a20;
  var b21 = a21 * a10 - a11 * a20; // Calculate the determinant

  var det = a00 * b01 + a01 * b11 + a02 * b21;

  if (!det) {
    return null;
  }

  det = 1.0 / det;
  out[0] = b01 * det;
  out[1] = (-a22 * a01 + a02 * a21) * det;
  out[2] = (a12 * a01 - a02 * a11) * det;
  out[3] = b11 * det;
  out[4] = (a22 * a00 - a02 * a20) * det;
  out[5] = (-a12 * a00 + a02 * a10) * det;
  out[6] = b21 * det;
  out[7] = (-a21 * a00 + a01 * a20) * det;
  out[8] = (a11 * a00 - a01 * a10) * det;
  return out;
}
/**
 * Calculates the adjugate of a mat3
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the source matrix
 * @returns {mat3} out
 */


function adjoint(out, a) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2];
  var a10 = a[3],
      a11 = a[4],
      a12 = a[5];
  var a20 = a[6],
      a21 = a[7],
      a22 = a[8];
  out[0] = a11 * a22 - a12 * a21;
  out[1] = a02 * a21 - a01 * a22;
  out[2] = a01 * a12 - a02 * a11;
  out[3] = a12 * a20 - a10 * a22;
  out[4] = a00 * a22 - a02 * a20;
  out[5] = a02 * a10 - a00 * a12;
  out[6] = a10 * a21 - a11 * a20;
  out[7] = a01 * a20 - a00 * a21;
  out[8] = a00 * a11 - a01 * a10;
  return out;
}
/**
 * Calculates the determinant of a mat3
 *
 * @param {mat3} a the source matrix
 * @returns {Number} determinant of a
 */


function determinant(a) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2];
  var a10 = a[3],
      a11 = a[4],
      a12 = a[5];
  var a20 = a[6],
      a21 = a[7],
      a22 = a[8];
  return a00 * (a22 * a11 - a12 * a21) + a01 * (-a22 * a10 + a12 * a20) + a02 * (a21 * a10 - a11 * a20);
}
/**
 * Multiplies two mat3's
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the first operand
 * @param {mat3} b the second operand
 * @returns {mat3} out
 */


function multiply(out, a, b) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2];
  var a10 = a[3],
      a11 = a[4],
      a12 = a[5];
  var a20 = a[6],
      a21 = a[7],
      a22 = a[8];
  var b00 = b[0],
      b01 = b[1],
      b02 = b[2];
  var b10 = b[3],
      b11 = b[4],
      b12 = b[5];
  var b20 = b[6],
      b21 = b[7],
      b22 = b[8];
  out[0] = b00 * a00 + b01 * a10 + b02 * a20;
  out[1] = b00 * a01 + b01 * a11 + b02 * a21;
  out[2] = b00 * a02 + b01 * a12 + b02 * a22;
  out[3] = b10 * a00 + b11 * a10 + b12 * a20;
  out[4] = b10 * a01 + b11 * a11 + b12 * a21;
  out[5] = b10 * a02 + b11 * a12 + b12 * a22;
  out[6] = b20 * a00 + b21 * a10 + b22 * a20;
  out[7] = b20 * a01 + b21 * a11 + b22 * a21;
  out[8] = b20 * a02 + b21 * a12 + b22 * a22;
  return out;
}
/**
 * Translate a mat3 by the given vector
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the matrix to translate
 * @param {vec2} v vector to translate by
 * @returns {mat3} out
 */


function translate(out, a, v) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a10 = a[3],
      a11 = a[4],
      a12 = a[5],
      a20 = a[6],
      a21 = a[7],
      a22 = a[8],
      x = v[0],
      y = v[1];
  out[0] = a00;
  out[1] = a01;
  out[2] = a02;
  out[3] = a10;
  out[4] = a11;
  out[5] = a12;
  out[6] = x * a00 + y * a10 + a20;
  out[7] = x * a01 + y * a11 + a21;
  out[8] = x * a02 + y * a12 + a22;
  return out;
}
/**
 * Rotates a mat3 by the given angle
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat3} out
 */


function rotate(out, a, rad) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a10 = a[3],
      a11 = a[4],
      a12 = a[5],
      a20 = a[6],
      a21 = a[7],
      a22 = a[8],
      s = Math.sin(rad),
      c = Math.cos(rad);
  out[0] = c * a00 + s * a10;
  out[1] = c * a01 + s * a11;
  out[2] = c * a02 + s * a12;
  out[3] = c * a10 - s * a00;
  out[4] = c * a11 - s * a01;
  out[5] = c * a12 - s * a02;
  out[6] = a20;
  out[7] = a21;
  out[8] = a22;
  return out;
}
/**
 * Scales the mat3 by the dimensions in the given vec2
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the matrix to rotate
 * @param {vec2} v the vec2 to scale the matrix by
 * @returns {mat3} out
 **/


function scale(out, a, v) {
  var x = v[0],
      y = v[1];
  out[0] = x * a[0];
  out[1] = x * a[1];
  out[2] = x * a[2];
  out[3] = y * a[3];
  out[4] = y * a[4];
  out[5] = y * a[5];
  out[6] = a[6];
  out[7] = a[7];
  out[8] = a[8];
  return out;
}
/**
 * Creates a matrix from a vector translation
 * This is equivalent to (but much faster than):
 *
 *     mat3.identity(dest);
 *     mat3.translate(dest, dest, vec);
 *
 * @param {mat3} out mat3 receiving operation result
 * @param {vec2} v Translation vector
 * @returns {mat3} out
 */


function fromTranslation(out, v) {
  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 1;
  out[5] = 0;
  out[6] = v[0];
  out[7] = v[1];
  out[8] = 1;
  return out;
}
/**
 * Creates a matrix from a given angle
 * This is equivalent to (but much faster than):
 *
 *     mat3.identity(dest);
 *     mat3.rotate(dest, dest, rad);
 *
 * @param {mat3} out mat3 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat3} out
 */


function fromRotation(out, rad) {
  var s = Math.sin(rad),
      c = Math.cos(rad);
  out[0] = c;
  out[1] = s;
  out[2] = 0;
  out[3] = -s;
  out[4] = c;
  out[5] = 0;
  out[6] = 0;
  out[7] = 0;
  out[8] = 1;
  return out;
}
/**
 * Creates a matrix from a vector scaling
 * This is equivalent to (but much faster than):
 *
 *     mat3.identity(dest);
 *     mat3.scale(dest, dest, vec);
 *
 * @param {mat3} out mat3 receiving operation result
 * @param {vec2} v Scaling vector
 * @returns {mat3} out
 */


function fromScaling(out, v) {
  out[0] = v[0];
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = v[1];
  out[5] = 0;
  out[6] = 0;
  out[7] = 0;
  out[8] = 1;
  return out;
}
/**
 * Copies the values from a mat2d into a mat3
 *
 * @param {mat3} out the receiving matrix
 * @param {mat2d} a the matrix to copy
 * @returns {mat3} out
 **/


function fromMat2d(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = 0;
  out[3] = a[2];
  out[4] = a[3];
  out[5] = 0;
  out[6] = a[4];
  out[7] = a[5];
  out[8] = 1;
  return out;
}
/**
 * Calculates a 3x3 matrix from the given quaternion
 *
 * @param {mat3} out mat3 receiving operation result
 * @param {quat} q Quaternion to create matrix from
 *
 * @returns {mat3} out
 */


function fromQuat(out, q) {
  var x = q[0],
      y = q[1],
      z = q[2],
      w = q[3];
  var x2 = x + x;
  var y2 = y + y;
  var z2 = z + z;
  var xx = x * x2;
  var yx = y * x2;
  var yy = y * y2;
  var zx = z * x2;
  var zy = z * y2;
  var zz = z * z2;
  var wx = w * x2;
  var wy = w * y2;
  var wz = w * z2;
  out[0] = 1 - yy - zz;
  out[3] = yx - wz;
  out[6] = zx + wy;
  out[1] = yx + wz;
  out[4] = 1 - xx - zz;
  out[7] = zy - wx;
  out[2] = zx - wy;
  out[5] = zy + wx;
  out[8] = 1 - xx - yy;
  return out;
}
/**
 * Calculates a 3x3 normal matrix (transpose inverse) from the 4x4 matrix
 *
 * @param {mat3} out mat3 receiving operation result
 * @param {mat4} a Mat4 to derive the normal matrix from
 *
 * @returns {mat3} out
 */


function normalFromMat4(out, a) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15];
  var b00 = a00 * a11 - a01 * a10;
  var b01 = a00 * a12 - a02 * a10;
  var b02 = a00 * a13 - a03 * a10;
  var b03 = a01 * a12 - a02 * a11;
  var b04 = a01 * a13 - a03 * a11;
  var b05 = a02 * a13 - a03 * a12;
  var b06 = a20 * a31 - a21 * a30;
  var b07 = a20 * a32 - a22 * a30;
  var b08 = a20 * a33 - a23 * a30;
  var b09 = a21 * a32 - a22 * a31;
  var b10 = a21 * a33 - a23 * a31;
  var b11 = a22 * a33 - a23 * a32; // Calculate the determinant

  var det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

  if (!det) {
    return null;
  }

  det = 1.0 / det;
  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
  out[1] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
  out[2] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
  out[3] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  out[4] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  out[5] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  out[6] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
  out[7] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
  out[8] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
  return out;
}
/**
 * Generates a 2D projection matrix with the given bounds
 *
 * @param {mat3} out mat3 frustum matrix will be written into
 * @param {number} width Width of your gl context
 * @param {number} height Height of gl context
 * @returns {mat3} out
 */


function projection(out, width, height) {
  out[0] = 2 / width;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = -2 / height;
  out[5] = 0;
  out[6] = -1;
  out[7] = 1;
  out[8] = 1;
  return out;
}
/**
 * Returns a string representation of a mat3
 *
 * @param {mat3} a matrix to represent as a string
 * @returns {String} string representation of the matrix
 */


function str(a) {
  return "mat3(" + a[0] + ", " + a[1] + ", " + a[2] + ", " + a[3] + ", " + a[4] + ", " + a[5] + ", " + a[6] + ", " + a[7] + ", " + a[8] + ")";
}
/**
 * Returns Frobenius norm of a mat3
 *
 * @param {mat3} a the matrix to calculate Frobenius norm of
 * @returns {Number} Frobenius norm
 */


function frob(a) {
  return Math.hypot(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8]);
}
/**
 * Adds two mat3's
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the first operand
 * @param {mat3} b the second operand
 * @returns {mat3} out
 */


function add(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  out[3] = a[3] + b[3];
  out[4] = a[4] + b[4];
  out[5] = a[5] + b[5];
  out[6] = a[6] + b[6];
  out[7] = a[7] + b[7];
  out[8] = a[8] + b[8];
  return out;
}
/**
 * Subtracts matrix b from matrix a
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the first operand
 * @param {mat3} b the second operand
 * @returns {mat3} out
 */


function subtract(out, a, b) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  out[3] = a[3] - b[3];
  out[4] = a[4] - b[4];
  out[5] = a[5] - b[5];
  out[6] = a[6] - b[6];
  out[7] = a[7] - b[7];
  out[8] = a[8] - b[8];
  return out;
}
/**
 * Multiply each element of the matrix by a scalar.
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the matrix to scale
 * @param {Number} b amount to scale the matrix's elements by
 * @returns {mat3} out
 */


function multiplyScalar(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  out[2] = a[2] * b;
  out[3] = a[3] * b;
  out[4] = a[4] * b;
  out[5] = a[5] * b;
  out[6] = a[6] * b;
  out[7] = a[7] * b;
  out[8] = a[8] * b;
  return out;
}
/**
 * Adds two mat3's after multiplying each element of the second operand by a scalar value.
 *
 * @param {mat3} out the receiving vector
 * @param {mat3} a the first operand
 * @param {mat3} b the second operand
 * @param {Number} scale the amount to scale b's elements by before adding
 * @returns {mat3} out
 */


function multiplyScalarAndAdd(out, a, b, scale) {
  out[0] = a[0] + b[0] * scale;
  out[1] = a[1] + b[1] * scale;
  out[2] = a[2] + b[2] * scale;
  out[3] = a[3] + b[3] * scale;
  out[4] = a[4] + b[4] * scale;
  out[5] = a[5] + b[5] * scale;
  out[6] = a[6] + b[6] * scale;
  out[7] = a[7] + b[7] * scale;
  out[8] = a[8] + b[8] * scale;
  return out;
}
/**
 * Returns whether or not the matrices have exactly the same elements in the same position (when compared with ===)
 *
 * @param {mat3} a The first matrix.
 * @param {mat3} b The second matrix.
 * @returns {Boolean} True if the matrices are equal, false otherwise.
 */


function exactEquals(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3] && a[4] === b[4] && a[5] === b[5] && a[6] === b[6] && a[7] === b[7] && a[8] === b[8];
}
/**
 * Returns whether or not the matrices have approximately the same elements in the same position.
 *
 * @param {mat3} a The first matrix.
 * @param {mat3} b The second matrix.
 * @returns {Boolean} True if the matrices are equal, false otherwise.
 */


function equals(a, b) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3],
      a4 = a[4],
      a5 = a[5],
      a6 = a[6],
      a7 = a[7],
      a8 = a[8];
  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3],
      b4 = b[4],
      b5 = b[5],
      b6 = b[6],
      b7 = b[7],
      b8 = b[8];
  return Math.abs(a0 - b0) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a3), Math.abs(b3)) && Math.abs(a4 - b4) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a4), Math.abs(b4)) && Math.abs(a5 - b5) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a5), Math.abs(b5)) && Math.abs(a6 - b6) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a6), Math.abs(b6)) && Math.abs(a7 - b7) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a7), Math.abs(b7)) && Math.abs(a8 - b8) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a8), Math.abs(b8));
}
/**
 * Alias for {@link mat3.multiply}
 * @function
 */


var mul = multiply;
/**
 * Alias for {@link mat3.subtract}
 * @function
 */

exports.mul = mul;
var sub = subtract;
exports.sub = sub;
},{"./common.js":2}],7:[function(require,module,exports){
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.create = create;
exports.clone = clone;
exports.copy = copy;
exports.fromValues = fromValues;
exports.set = set;
exports.identity = identity;
exports.transpose = transpose;
exports.invert = invert;
exports.adjoint = adjoint;
exports.determinant = determinant;
exports.multiply = multiply;
exports.translate = translate;
exports.scale = scale;
exports.rotate = rotate;
exports.rotateX = rotateX;
exports.rotateY = rotateY;
exports.rotateZ = rotateZ;
exports.fromTranslation = fromTranslation;
exports.fromScaling = fromScaling;
exports.fromRotation = fromRotation;
exports.fromXRotation = fromXRotation;
exports.fromYRotation = fromYRotation;
exports.fromZRotation = fromZRotation;
exports.fromRotationTranslation = fromRotationTranslation;
exports.fromQuat2 = fromQuat2;
exports.getTranslation = getTranslation;
exports.getScaling = getScaling;
exports.getRotation = getRotation;
exports.fromRotationTranslationScale = fromRotationTranslationScale;
exports.fromRotationTranslationScaleOrigin = fromRotationTranslationScaleOrigin;
exports.fromQuat = fromQuat;
exports.frustum = frustum;
exports.perspective = perspective;
exports.perspectiveFromFieldOfView = perspectiveFromFieldOfView;
exports.ortho = ortho;
exports.lookAt = lookAt;
exports.targetTo = targetTo;
exports.str = str;
exports.frob = frob;
exports.add = add;
exports.subtract = subtract;
exports.multiplyScalar = multiplyScalar;
exports.multiplyScalarAndAdd = multiplyScalarAndAdd;
exports.exactEquals = exactEquals;
exports.equals = equals;
exports.sub = exports.mul = void 0;

var glMatrix = _interopRequireWildcard(require("./common.js"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function _getRequireWildcardCache() { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

/**
 * 4x4 Matrix<br>Format: column-major, when typed out it looks like row-major<br>The matrices are being post multiplied.
 * @module mat4
 */

/**
 * Creates a new identity mat4
 *
 * @returns {mat4} a new 4x4 matrix
 */
function create() {
  var out = new glMatrix.ARRAY_TYPE(16);

  if (glMatrix.ARRAY_TYPE != Float32Array) {
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
  }

  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[15] = 1;
  return out;
}
/**
 * Creates a new mat4 initialized with values from an existing matrix
 *
 * @param {mat4} a matrix to clone
 * @returns {mat4} a new 4x4 matrix
 */


function clone(a) {
  var out = new glMatrix.ARRAY_TYPE(16);
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  out[4] = a[4];
  out[5] = a[5];
  out[6] = a[6];
  out[7] = a[7];
  out[8] = a[8];
  out[9] = a[9];
  out[10] = a[10];
  out[11] = a[11];
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  return out;
}
/**
 * Copy the values from one mat4 to another
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */


function copy(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  out[4] = a[4];
  out[5] = a[5];
  out[6] = a[6];
  out[7] = a[7];
  out[8] = a[8];
  out[9] = a[9];
  out[10] = a[10];
  out[11] = a[11];
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  return out;
}
/**
 * Create a new mat4 with the given values
 *
 * @param {Number} m00 Component in column 0, row 0 position (index 0)
 * @param {Number} m01 Component in column 0, row 1 position (index 1)
 * @param {Number} m02 Component in column 0, row 2 position (index 2)
 * @param {Number} m03 Component in column 0, row 3 position (index 3)
 * @param {Number} m10 Component in column 1, row 0 position (index 4)
 * @param {Number} m11 Component in column 1, row 1 position (index 5)
 * @param {Number} m12 Component in column 1, row 2 position (index 6)
 * @param {Number} m13 Component in column 1, row 3 position (index 7)
 * @param {Number} m20 Component in column 2, row 0 position (index 8)
 * @param {Number} m21 Component in column 2, row 1 position (index 9)
 * @param {Number} m22 Component in column 2, row 2 position (index 10)
 * @param {Number} m23 Component in column 2, row 3 position (index 11)
 * @param {Number} m30 Component in column 3, row 0 position (index 12)
 * @param {Number} m31 Component in column 3, row 1 position (index 13)
 * @param {Number} m32 Component in column 3, row 2 position (index 14)
 * @param {Number} m33 Component in column 3, row 3 position (index 15)
 * @returns {mat4} A new mat4
 */


function fromValues(m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33) {
  var out = new glMatrix.ARRAY_TYPE(16);
  out[0] = m00;
  out[1] = m01;
  out[2] = m02;
  out[3] = m03;
  out[4] = m10;
  out[5] = m11;
  out[6] = m12;
  out[7] = m13;
  out[8] = m20;
  out[9] = m21;
  out[10] = m22;
  out[11] = m23;
  out[12] = m30;
  out[13] = m31;
  out[14] = m32;
  out[15] = m33;
  return out;
}
/**
 * Set the components of a mat4 to the given values
 *
 * @param {mat4} out the receiving matrix
 * @param {Number} m00 Component in column 0, row 0 position (index 0)
 * @param {Number} m01 Component in column 0, row 1 position (index 1)
 * @param {Number} m02 Component in column 0, row 2 position (index 2)
 * @param {Number} m03 Component in column 0, row 3 position (index 3)
 * @param {Number} m10 Component in column 1, row 0 position (index 4)
 * @param {Number} m11 Component in column 1, row 1 position (index 5)
 * @param {Number} m12 Component in column 1, row 2 position (index 6)
 * @param {Number} m13 Component in column 1, row 3 position (index 7)
 * @param {Number} m20 Component in column 2, row 0 position (index 8)
 * @param {Number} m21 Component in column 2, row 1 position (index 9)
 * @param {Number} m22 Component in column 2, row 2 position (index 10)
 * @param {Number} m23 Component in column 2, row 3 position (index 11)
 * @param {Number} m30 Component in column 3, row 0 position (index 12)
 * @param {Number} m31 Component in column 3, row 1 position (index 13)
 * @param {Number} m32 Component in column 3, row 2 position (index 14)
 * @param {Number} m33 Component in column 3, row 3 position (index 15)
 * @returns {mat4} out
 */


function set(out, m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33) {
  out[0] = m00;
  out[1] = m01;
  out[2] = m02;
  out[3] = m03;
  out[4] = m10;
  out[5] = m11;
  out[6] = m12;
  out[7] = m13;
  out[8] = m20;
  out[9] = m21;
  out[10] = m22;
  out[11] = m23;
  out[12] = m30;
  out[13] = m31;
  out[14] = m32;
  out[15] = m33;
  return out;
}
/**
 * Set a mat4 to the identity matrix
 *
 * @param {mat4} out the receiving matrix
 * @returns {mat4} out
 */


function identity(out) {
  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = 1;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 1;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Transpose the values of a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */


function transpose(out, a) {
  // If we are transposing ourselves we can skip a few steps but have to cache some values
  if (out === a) {
    var a01 = a[1],
        a02 = a[2],
        a03 = a[3];
    var a12 = a[6],
        a13 = a[7];
    var a23 = a[11];
    out[1] = a[4];
    out[2] = a[8];
    out[3] = a[12];
    out[4] = a01;
    out[6] = a[9];
    out[7] = a[13];
    out[8] = a02;
    out[9] = a12;
    out[11] = a[14];
    out[12] = a03;
    out[13] = a13;
    out[14] = a23;
  } else {
    out[0] = a[0];
    out[1] = a[4];
    out[2] = a[8];
    out[3] = a[12];
    out[4] = a[1];
    out[5] = a[5];
    out[6] = a[9];
    out[7] = a[13];
    out[8] = a[2];
    out[9] = a[6];
    out[10] = a[10];
    out[11] = a[14];
    out[12] = a[3];
    out[13] = a[7];
    out[14] = a[11];
    out[15] = a[15];
  }

  return out;
}
/**
 * Inverts a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */


function invert(out, a) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15];
  var b00 = a00 * a11 - a01 * a10;
  var b01 = a00 * a12 - a02 * a10;
  var b02 = a00 * a13 - a03 * a10;
  var b03 = a01 * a12 - a02 * a11;
  var b04 = a01 * a13 - a03 * a11;
  var b05 = a02 * a13 - a03 * a12;
  var b06 = a20 * a31 - a21 * a30;
  var b07 = a20 * a32 - a22 * a30;
  var b08 = a20 * a33 - a23 * a30;
  var b09 = a21 * a32 - a22 * a31;
  var b10 = a21 * a33 - a23 * a31;
  var b11 = a22 * a33 - a23 * a32; // Calculate the determinant

  var det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

  if (!det) {
    return null;
  }

  det = 1.0 / det;
  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
  out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
  out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
  out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
  out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
  out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
  out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
  out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
  out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
  out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
  return out;
}
/**
 * Calculates the adjugate of a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */


function adjoint(out, a) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15];
  out[0] = a11 * (a22 * a33 - a23 * a32) - a21 * (a12 * a33 - a13 * a32) + a31 * (a12 * a23 - a13 * a22);
  out[1] = -(a01 * (a22 * a33 - a23 * a32) - a21 * (a02 * a33 - a03 * a32) + a31 * (a02 * a23 - a03 * a22));
  out[2] = a01 * (a12 * a33 - a13 * a32) - a11 * (a02 * a33 - a03 * a32) + a31 * (a02 * a13 - a03 * a12);
  out[3] = -(a01 * (a12 * a23 - a13 * a22) - a11 * (a02 * a23 - a03 * a22) + a21 * (a02 * a13 - a03 * a12));
  out[4] = -(a10 * (a22 * a33 - a23 * a32) - a20 * (a12 * a33 - a13 * a32) + a30 * (a12 * a23 - a13 * a22));
  out[5] = a00 * (a22 * a33 - a23 * a32) - a20 * (a02 * a33 - a03 * a32) + a30 * (a02 * a23 - a03 * a22);
  out[6] = -(a00 * (a12 * a33 - a13 * a32) - a10 * (a02 * a33 - a03 * a32) + a30 * (a02 * a13 - a03 * a12));
  out[7] = a00 * (a12 * a23 - a13 * a22) - a10 * (a02 * a23 - a03 * a22) + a20 * (a02 * a13 - a03 * a12);
  out[8] = a10 * (a21 * a33 - a23 * a31) - a20 * (a11 * a33 - a13 * a31) + a30 * (a11 * a23 - a13 * a21);
  out[9] = -(a00 * (a21 * a33 - a23 * a31) - a20 * (a01 * a33 - a03 * a31) + a30 * (a01 * a23 - a03 * a21));
  out[10] = a00 * (a11 * a33 - a13 * a31) - a10 * (a01 * a33 - a03 * a31) + a30 * (a01 * a13 - a03 * a11);
  out[11] = -(a00 * (a11 * a23 - a13 * a21) - a10 * (a01 * a23 - a03 * a21) + a20 * (a01 * a13 - a03 * a11));
  out[12] = -(a10 * (a21 * a32 - a22 * a31) - a20 * (a11 * a32 - a12 * a31) + a30 * (a11 * a22 - a12 * a21));
  out[13] = a00 * (a21 * a32 - a22 * a31) - a20 * (a01 * a32 - a02 * a31) + a30 * (a01 * a22 - a02 * a21);
  out[14] = -(a00 * (a11 * a32 - a12 * a31) - a10 * (a01 * a32 - a02 * a31) + a30 * (a01 * a12 - a02 * a11));
  out[15] = a00 * (a11 * a22 - a12 * a21) - a10 * (a01 * a22 - a02 * a21) + a20 * (a01 * a12 - a02 * a11);
  return out;
}
/**
 * Calculates the determinant of a mat4
 *
 * @param {mat4} a the source matrix
 * @returns {Number} determinant of a
 */


function determinant(a) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15];
  var b00 = a00 * a11 - a01 * a10;
  var b01 = a00 * a12 - a02 * a10;
  var b02 = a00 * a13 - a03 * a10;
  var b03 = a01 * a12 - a02 * a11;
  var b04 = a01 * a13 - a03 * a11;
  var b05 = a02 * a13 - a03 * a12;
  var b06 = a20 * a31 - a21 * a30;
  var b07 = a20 * a32 - a22 * a30;
  var b08 = a20 * a33 - a23 * a30;
  var b09 = a21 * a32 - a22 * a31;
  var b10 = a21 * a33 - a23 * a31;
  var b11 = a22 * a33 - a23 * a32; // Calculate the determinant

  return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
}
/**
 * Multiplies two mat4s
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the first operand
 * @param {mat4} b the second operand
 * @returns {mat4} out
 */


function multiply(out, a, b) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15]; // Cache only the current line of the second matrix

  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3];
  out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[4];
  b1 = b[5];
  b2 = b[6];
  b3 = b[7];
  out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[8];
  b1 = b[9];
  b2 = b[10];
  b3 = b[11];
  out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[12];
  b1 = b[13];
  b2 = b[14];
  b3 = b[15];
  out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  return out;
}
/**
 * Translate a mat4 by the given vector
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to translate
 * @param {vec3} v vector to translate by
 * @returns {mat4} out
 */


function translate(out, a, v) {
  var x = v[0],
      y = v[1],
      z = v[2];
  var a00, a01, a02, a03;
  var a10, a11, a12, a13;
  var a20, a21, a22, a23;

  if (a === out) {
    out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
    out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
    out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
    out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
  } else {
    a00 = a[0];
    a01 = a[1];
    a02 = a[2];
    a03 = a[3];
    a10 = a[4];
    a11 = a[5];
    a12 = a[6];
    a13 = a[7];
    a20 = a[8];
    a21 = a[9];
    a22 = a[10];
    a23 = a[11];
    out[0] = a00;
    out[1] = a01;
    out[2] = a02;
    out[3] = a03;
    out[4] = a10;
    out[5] = a11;
    out[6] = a12;
    out[7] = a13;
    out[8] = a20;
    out[9] = a21;
    out[10] = a22;
    out[11] = a23;
    out[12] = a00 * x + a10 * y + a20 * z + a[12];
    out[13] = a01 * x + a11 * y + a21 * z + a[13];
    out[14] = a02 * x + a12 * y + a22 * z + a[14];
    out[15] = a03 * x + a13 * y + a23 * z + a[15];
  }

  return out;
}
/**
 * Scales the mat4 by the dimensions in the given vec3 not using vectorization
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to scale
 * @param {vec3} v the vec3 to scale the matrix by
 * @returns {mat4} out
 **/


function scale(out, a, v) {
  var x = v[0],
      y = v[1],
      z = v[2];
  out[0] = a[0] * x;
  out[1] = a[1] * x;
  out[2] = a[2] * x;
  out[3] = a[3] * x;
  out[4] = a[4] * y;
  out[5] = a[5] * y;
  out[6] = a[6] * y;
  out[7] = a[7] * y;
  out[8] = a[8] * z;
  out[9] = a[9] * z;
  out[10] = a[10] * z;
  out[11] = a[11] * z;
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  return out;
}
/**
 * Rotates a mat4 by the given angle around the given axis
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @param {vec3} axis the axis to rotate around
 * @returns {mat4} out
 */


function rotate(out, a, rad, axis) {
  var x = axis[0],
      y = axis[1],
      z = axis[2];
  var len = Math.hypot(x, y, z);
  var s, c, t;
  var a00, a01, a02, a03;
  var a10, a11, a12, a13;
  var a20, a21, a22, a23;
  var b00, b01, b02;
  var b10, b11, b12;
  var b20, b21, b22;

  if (len < glMatrix.EPSILON) {
    return null;
  }

  len = 1 / len;
  x *= len;
  y *= len;
  z *= len;
  s = Math.sin(rad);
  c = Math.cos(rad);
  t = 1 - c;
  a00 = a[0];
  a01 = a[1];
  a02 = a[2];
  a03 = a[3];
  a10 = a[4];
  a11 = a[5];
  a12 = a[6];
  a13 = a[7];
  a20 = a[8];
  a21 = a[9];
  a22 = a[10];
  a23 = a[11]; // Construct the elements of the rotation matrix

  b00 = x * x * t + c;
  b01 = y * x * t + z * s;
  b02 = z * x * t - y * s;
  b10 = x * y * t - z * s;
  b11 = y * y * t + c;
  b12 = z * y * t + x * s;
  b20 = x * z * t + y * s;
  b21 = y * z * t - x * s;
  b22 = z * z * t + c; // Perform rotation-specific matrix multiplication

  out[0] = a00 * b00 + a10 * b01 + a20 * b02;
  out[1] = a01 * b00 + a11 * b01 + a21 * b02;
  out[2] = a02 * b00 + a12 * b01 + a22 * b02;
  out[3] = a03 * b00 + a13 * b01 + a23 * b02;
  out[4] = a00 * b10 + a10 * b11 + a20 * b12;
  out[5] = a01 * b10 + a11 * b11 + a21 * b12;
  out[6] = a02 * b10 + a12 * b11 + a22 * b12;
  out[7] = a03 * b10 + a13 * b11 + a23 * b12;
  out[8] = a00 * b20 + a10 * b21 + a20 * b22;
  out[9] = a01 * b20 + a11 * b21 + a21 * b22;
  out[10] = a02 * b20 + a12 * b21 + a22 * b22;
  out[11] = a03 * b20 + a13 * b21 + a23 * b22;

  if (a !== out) {
    // If the source and destination differ, copy the unchanged last row
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  }

  return out;
}
/**
 * Rotates a matrix by the given angle around the X axis
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */


function rotateX(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a10 = a[4];
  var a11 = a[5];
  var a12 = a[6];
  var a13 = a[7];
  var a20 = a[8];
  var a21 = a[9];
  var a22 = a[10];
  var a23 = a[11];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged rows
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[4] = a10 * c + a20 * s;
  out[5] = a11 * c + a21 * s;
  out[6] = a12 * c + a22 * s;
  out[7] = a13 * c + a23 * s;
  out[8] = a20 * c - a10 * s;
  out[9] = a21 * c - a11 * s;
  out[10] = a22 * c - a12 * s;
  out[11] = a23 * c - a13 * s;
  return out;
}
/**
 * Rotates a matrix by the given angle around the Y axis
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */


function rotateY(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a00 = a[0];
  var a01 = a[1];
  var a02 = a[2];
  var a03 = a[3];
  var a20 = a[8];
  var a21 = a[9];
  var a22 = a[10];
  var a23 = a[11];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged rows
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[0] = a00 * c - a20 * s;
  out[1] = a01 * c - a21 * s;
  out[2] = a02 * c - a22 * s;
  out[3] = a03 * c - a23 * s;
  out[8] = a00 * s + a20 * c;
  out[9] = a01 * s + a21 * c;
  out[10] = a02 * s + a22 * c;
  out[11] = a03 * s + a23 * c;
  return out;
}
/**
 * Rotates a matrix by the given angle around the Z axis
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */


function rotateZ(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a00 = a[0];
  var a01 = a[1];
  var a02 = a[2];
  var a03 = a[3];
  var a10 = a[4];
  var a11 = a[5];
  var a12 = a[6];
  var a13 = a[7];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged last row
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[0] = a00 * c + a10 * s;
  out[1] = a01 * c + a11 * s;
  out[2] = a02 * c + a12 * s;
  out[3] = a03 * c + a13 * s;
  out[4] = a10 * c - a00 * s;
  out[5] = a11 * c - a01 * s;
  out[6] = a12 * c - a02 * s;
  out[7] = a13 * c - a03 * s;
  return out;
}
/**
 * Creates a matrix from a vector translation
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.translate(dest, dest, vec);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {vec3} v Translation vector
 * @returns {mat4} out
 */


function fromTranslation(out, v) {
  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = 1;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 1;
  out[11] = 0;
  out[12] = v[0];
  out[13] = v[1];
  out[14] = v[2];
  out[15] = 1;
  return out;
}
/**
 * Creates a matrix from a vector scaling
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.scale(dest, dest, vec);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {vec3} v Scaling vector
 * @returns {mat4} out
 */


function fromScaling(out, v) {
  out[0] = v[0];
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = v[1];
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = v[2];
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Creates a matrix from a given angle around a given axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.rotate(dest, dest, rad, axis);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @param {vec3} axis the axis to rotate around
 * @returns {mat4} out
 */


function fromRotation(out, rad, axis) {
  var x = axis[0],
      y = axis[1],
      z = axis[2];
  var len = Math.hypot(x, y, z);
  var s, c, t;

  if (len < glMatrix.EPSILON) {
    return null;
  }

  len = 1 / len;
  x *= len;
  y *= len;
  z *= len;
  s = Math.sin(rad);
  c = Math.cos(rad);
  t = 1 - c; // Perform rotation-specific matrix multiplication

  out[0] = x * x * t + c;
  out[1] = y * x * t + z * s;
  out[2] = z * x * t - y * s;
  out[3] = 0;
  out[4] = x * y * t - z * s;
  out[5] = y * y * t + c;
  out[6] = z * y * t + x * s;
  out[7] = 0;
  out[8] = x * z * t + y * s;
  out[9] = y * z * t - x * s;
  out[10] = z * z * t + c;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Creates a matrix from the given angle around the X axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.rotateX(dest, dest, rad);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */


function fromXRotation(out, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad); // Perform axis-specific matrix multiplication

  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = c;
  out[6] = s;
  out[7] = 0;
  out[8] = 0;
  out[9] = -s;
  out[10] = c;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Creates a matrix from the given angle around the Y axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.rotateY(dest, dest, rad);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */


function fromYRotation(out, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad); // Perform axis-specific matrix multiplication

  out[0] = c;
  out[1] = 0;
  out[2] = -s;
  out[3] = 0;
  out[4] = 0;
  out[5] = 1;
  out[6] = 0;
  out[7] = 0;
  out[8] = s;
  out[9] = 0;
  out[10] = c;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Creates a matrix from the given angle around the Z axis
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.rotateZ(dest, dest, rad);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */


function fromZRotation(out, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad); // Perform axis-specific matrix multiplication

  out[0] = c;
  out[1] = s;
  out[2] = 0;
  out[3] = 0;
  out[4] = -s;
  out[5] = c;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 1;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Creates a matrix from a quaternion rotation and vector translation
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.translate(dest, vec);
 *     let quatMat = mat4.create();
 *     quat4.toMat4(quat, quatMat);
 *     mat4.multiply(dest, quatMat);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {quat4} q Rotation quaternion
 * @param {vec3} v Translation vector
 * @returns {mat4} out
 */


function fromRotationTranslation(out, q, v) {
  // Quaternion math
  var x = q[0],
      y = q[1],
      z = q[2],
      w = q[3];
  var x2 = x + x;
  var y2 = y + y;
  var z2 = z + z;
  var xx = x * x2;
  var xy = x * y2;
  var xz = x * z2;
  var yy = y * y2;
  var yz = y * z2;
  var zz = z * z2;
  var wx = w * x2;
  var wy = w * y2;
  var wz = w * z2;
  out[0] = 1 - (yy + zz);
  out[1] = xy + wz;
  out[2] = xz - wy;
  out[3] = 0;
  out[4] = xy - wz;
  out[5] = 1 - (xx + zz);
  out[6] = yz + wx;
  out[7] = 0;
  out[8] = xz + wy;
  out[9] = yz - wx;
  out[10] = 1 - (xx + yy);
  out[11] = 0;
  out[12] = v[0];
  out[13] = v[1];
  out[14] = v[2];
  out[15] = 1;
  return out;
}
/**
 * Creates a new mat4 from a dual quat.
 *
 * @param {mat4} out Matrix
 * @param {quat2} a Dual Quaternion
 * @returns {mat4} mat4 receiving operation result
 */


function fromQuat2(out, a) {
  var translation = new glMatrix.ARRAY_TYPE(3);
  var bx = -a[0],
      by = -a[1],
      bz = -a[2],
      bw = a[3],
      ax = a[4],
      ay = a[5],
      az = a[6],
      aw = a[7];
  var magnitude = bx * bx + by * by + bz * bz + bw * bw; //Only scale if it makes sense

  if (magnitude > 0) {
    translation[0] = (ax * bw + aw * bx + ay * bz - az * by) * 2 / magnitude;
    translation[1] = (ay * bw + aw * by + az * bx - ax * bz) * 2 / magnitude;
    translation[2] = (az * bw + aw * bz + ax * by - ay * bx) * 2 / magnitude;
  } else {
    translation[0] = (ax * bw + aw * bx + ay * bz - az * by) * 2;
    translation[1] = (ay * bw + aw * by + az * bx - ax * bz) * 2;
    translation[2] = (az * bw + aw * bz + ax * by - ay * bx) * 2;
  }

  fromRotationTranslation(out, a, translation);
  return out;
}
/**
 * Returns the translation vector component of a transformation
 *  matrix. If a matrix is built with fromRotationTranslation,
 *  the returned vector will be the same as the translation vector
 *  originally supplied.
 * @param  {vec3} out Vector to receive translation component
 * @param  {mat4} mat Matrix to be decomposed (input)
 * @return {vec3} out
 */


function getTranslation(out, mat) {
  out[0] = mat[12];
  out[1] = mat[13];
  out[2] = mat[14];
  return out;
}
/**
 * Returns the scaling factor component of a transformation
 *  matrix. If a matrix is built with fromRotationTranslationScale
 *  with a normalized Quaternion paramter, the returned vector will be
 *  the same as the scaling vector
 *  originally supplied.
 * @param  {vec3} out Vector to receive scaling factor component
 * @param  {mat4} mat Matrix to be decomposed (input)
 * @return {vec3} out
 */


function getScaling(out, mat) {
  var m11 = mat[0];
  var m12 = mat[1];
  var m13 = mat[2];
  var m21 = mat[4];
  var m22 = mat[5];
  var m23 = mat[6];
  var m31 = mat[8];
  var m32 = mat[9];
  var m33 = mat[10];
  out[0] = Math.hypot(m11, m12, m13);
  out[1] = Math.hypot(m21, m22, m23);
  out[2] = Math.hypot(m31, m32, m33);
  return out;
}
/**
 * Returns a quaternion representing the rotational component
 *  of a transformation matrix. If a matrix is built with
 *  fromRotationTranslation, the returned quaternion will be the
 *  same as the quaternion originally supplied.
 * @param {quat} out Quaternion to receive the rotation component
 * @param {mat4} mat Matrix to be decomposed (input)
 * @return {quat} out
 */


function getRotation(out, mat) {
  var scaling = new glMatrix.ARRAY_TYPE(3);
  getScaling(scaling, mat);
  var is1 = 1 / scaling[0];
  var is2 = 1 / scaling[1];
  var is3 = 1 / scaling[2];
  var sm11 = mat[0] * is1;
  var sm12 = mat[1] * is2;
  var sm13 = mat[2] * is3;
  var sm21 = mat[4] * is1;
  var sm22 = mat[5] * is2;
  var sm23 = mat[6] * is3;
  var sm31 = mat[8] * is1;
  var sm32 = mat[9] * is2;
  var sm33 = mat[10] * is3;
  var trace = sm11 + sm22 + sm33;
  var S = 0;

  if (trace > 0) {
    S = Math.sqrt(trace + 1.0) * 2;
    out[3] = 0.25 * S;
    out[0] = (sm23 - sm32) / S;
    out[1] = (sm31 - sm13) / S;
    out[2] = (sm12 - sm21) / S;
  } else if (sm11 > sm22 && sm11 > sm33) {
    S = Math.sqrt(1.0 + sm11 - sm22 - sm33) * 2;
    out[3] = (sm23 - sm32) / S;
    out[0] = 0.25 * S;
    out[1] = (sm12 + sm21) / S;
    out[2] = (sm31 + sm13) / S;
  } else if (sm22 > sm33) {
    S = Math.sqrt(1.0 + sm22 - sm11 - sm33) * 2;
    out[3] = (sm31 - sm13) / S;
    out[0] = (sm12 + sm21) / S;
    out[1] = 0.25 * S;
    out[2] = (sm23 + sm32) / S;
  } else {
    S = Math.sqrt(1.0 + sm33 - sm11 - sm22) * 2;
    out[3] = (sm12 - sm21) / S;
    out[0] = (sm31 + sm13) / S;
    out[1] = (sm23 + sm32) / S;
    out[2] = 0.25 * S;
  }

  return out;
}
/**
 * Creates a matrix from a quaternion rotation, vector translation and vector scale
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.translate(dest, vec);
 *     let quatMat = mat4.create();
 *     quat4.toMat4(quat, quatMat);
 *     mat4.multiply(dest, quatMat);
 *     mat4.scale(dest, scale)
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {quat4} q Rotation quaternion
 * @param {vec3} v Translation vector
 * @param {vec3} s Scaling vector
 * @returns {mat4} out
 */


function fromRotationTranslationScale(out, q, v, s) {
  // Quaternion math
  var x = q[0],
      y = q[1],
      z = q[2],
      w = q[3];
  var x2 = x + x;
  var y2 = y + y;
  var z2 = z + z;
  var xx = x * x2;
  var xy = x * y2;
  var xz = x * z2;
  var yy = y * y2;
  var yz = y * z2;
  var zz = z * z2;
  var wx = w * x2;
  var wy = w * y2;
  var wz = w * z2;
  var sx = s[0];
  var sy = s[1];
  var sz = s[2];
  out[0] = (1 - (yy + zz)) * sx;
  out[1] = (xy + wz) * sx;
  out[2] = (xz - wy) * sx;
  out[3] = 0;
  out[4] = (xy - wz) * sy;
  out[5] = (1 - (xx + zz)) * sy;
  out[6] = (yz + wx) * sy;
  out[7] = 0;
  out[8] = (xz + wy) * sz;
  out[9] = (yz - wx) * sz;
  out[10] = (1 - (xx + yy)) * sz;
  out[11] = 0;
  out[12] = v[0];
  out[13] = v[1];
  out[14] = v[2];
  out[15] = 1;
  return out;
}
/**
 * Creates a matrix from a quaternion rotation, vector translation and vector scale, rotating and scaling around the given origin
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.translate(dest, vec);
 *     mat4.translate(dest, origin);
 *     let quatMat = mat4.create();
 *     quat4.toMat4(quat, quatMat);
 *     mat4.multiply(dest, quatMat);
 *     mat4.scale(dest, scale)
 *     mat4.translate(dest, negativeOrigin);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {quat4} q Rotation quaternion
 * @param {vec3} v Translation vector
 * @param {vec3} s Scaling vector
 * @param {vec3} o The origin vector around which to scale and rotate
 * @returns {mat4} out
 */


function fromRotationTranslationScaleOrigin(out, q, v, s, o) {
  // Quaternion math
  var x = q[0],
      y = q[1],
      z = q[2],
      w = q[3];
  var x2 = x + x;
  var y2 = y + y;
  var z2 = z + z;
  var xx = x * x2;
  var xy = x * y2;
  var xz = x * z2;
  var yy = y * y2;
  var yz = y * z2;
  var zz = z * z2;
  var wx = w * x2;
  var wy = w * y2;
  var wz = w * z2;
  var sx = s[0];
  var sy = s[1];
  var sz = s[2];
  var ox = o[0];
  var oy = o[1];
  var oz = o[2];
  var out0 = (1 - (yy + zz)) * sx;
  var out1 = (xy + wz) * sx;
  var out2 = (xz - wy) * sx;
  var out4 = (xy - wz) * sy;
  var out5 = (1 - (xx + zz)) * sy;
  var out6 = (yz + wx) * sy;
  var out8 = (xz + wy) * sz;
  var out9 = (yz - wx) * sz;
  var out10 = (1 - (xx + yy)) * sz;
  out[0] = out0;
  out[1] = out1;
  out[2] = out2;
  out[3] = 0;
  out[4] = out4;
  out[5] = out5;
  out[6] = out6;
  out[7] = 0;
  out[8] = out8;
  out[9] = out9;
  out[10] = out10;
  out[11] = 0;
  out[12] = v[0] + ox - (out0 * ox + out4 * oy + out8 * oz);
  out[13] = v[1] + oy - (out1 * ox + out5 * oy + out9 * oz);
  out[14] = v[2] + oz - (out2 * ox + out6 * oy + out10 * oz);
  out[15] = 1;
  return out;
}
/**
 * Calculates a 4x4 matrix from the given quaternion
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {quat} q Quaternion to create matrix from
 *
 * @returns {mat4} out
 */


function fromQuat(out, q) {
  var x = q[0],
      y = q[1],
      z = q[2],
      w = q[3];
  var x2 = x + x;
  var y2 = y + y;
  var z2 = z + z;
  var xx = x * x2;
  var yx = y * x2;
  var yy = y * y2;
  var zx = z * x2;
  var zy = z * y2;
  var zz = z * z2;
  var wx = w * x2;
  var wy = w * y2;
  var wz = w * z2;
  out[0] = 1 - yy - zz;
  out[1] = yx + wz;
  out[2] = zx - wy;
  out[3] = 0;
  out[4] = yx - wz;
  out[5] = 1 - xx - zz;
  out[6] = zy + wx;
  out[7] = 0;
  out[8] = zx + wy;
  out[9] = zy - wx;
  out[10] = 1 - xx - yy;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Generates a frustum matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {Number} left Left bound of the frustum
 * @param {Number} right Right bound of the frustum
 * @param {Number} bottom Bottom bound of the frustum
 * @param {Number} top Top bound of the frustum
 * @param {Number} near Near bound of the frustum
 * @param {Number} far Far bound of the frustum
 * @returns {mat4} out
 */


function frustum(out, left, right, bottom, top, near, far) {
  var rl = 1 / (right - left);
  var tb = 1 / (top - bottom);
  var nf = 1 / (near - far);
  out[0] = near * 2 * rl;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = near * 2 * tb;
  out[6] = 0;
  out[7] = 0;
  out[8] = (right + left) * rl;
  out[9] = (top + bottom) * tb;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[12] = 0;
  out[13] = 0;
  out[14] = far * near * 2 * nf;
  out[15] = 0;
  return out;
}
/**
 * Generates a perspective projection matrix with the given bounds.
 * Passing null/undefined/no value for far will generate infinite projection matrix.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} fovy Vertical field of view in radians
 * @param {number} aspect Aspect ratio. typically viewport width/height
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum, can be null or Infinity
 * @returns {mat4} out
 */


function perspective(out, fovy, aspect, near, far) {
  var f = 1.0 / Math.tan(fovy / 2),
      nf;
  out[0] = f / aspect;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = f;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[11] = -1;
  out[12] = 0;
  out[13] = 0;
  out[15] = 0;

  if (far != null && far !== Infinity) {
    nf = 1 / (near - far);
    out[10] = (far + near) * nf;
    out[14] = 2 * far * near * nf;
  } else {
    out[10] = -1;
    out[14] = -2 * near;
  }

  return out;
}
/**
 * Generates a perspective projection matrix with the given field of view.
 * This is primarily useful for generating projection matrices to be used
 * with the still experiemental WebVR API.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {Object} fov Object containing the following values: upDegrees, downDegrees, leftDegrees, rightDegrees
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */


function perspectiveFromFieldOfView(out, fov, near, far) {
  var upTan = Math.tan(fov.upDegrees * Math.PI / 180.0);
  var downTan = Math.tan(fov.downDegrees * Math.PI / 180.0);
  var leftTan = Math.tan(fov.leftDegrees * Math.PI / 180.0);
  var rightTan = Math.tan(fov.rightDegrees * Math.PI / 180.0);
  var xScale = 2.0 / (leftTan + rightTan);
  var yScale = 2.0 / (upTan + downTan);
  out[0] = xScale;
  out[1] = 0.0;
  out[2] = 0.0;
  out[3] = 0.0;
  out[4] = 0.0;
  out[5] = yScale;
  out[6] = 0.0;
  out[7] = 0.0;
  out[8] = -((leftTan - rightTan) * xScale * 0.5);
  out[9] = (upTan - downTan) * yScale * 0.5;
  out[10] = far / (near - far);
  out[11] = -1.0;
  out[12] = 0.0;
  out[13] = 0.0;
  out[14] = far * near / (near - far);
  out[15] = 0.0;
  return out;
}
/**
 * Generates a orthogonal projection matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} left Left bound of the frustum
 * @param {number} right Right bound of the frustum
 * @param {number} bottom Bottom bound of the frustum
 * @param {number} top Top bound of the frustum
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */


function ortho(out, left, right, bottom, top, near, far) {
  var lr = 1 / (left - right);
  var bt = 1 / (bottom - top);
  var nf = 1 / (near - far);
  out[0] = -2 * lr;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = -2 * bt;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 2 * nf;
  out[11] = 0;
  out[12] = (left + right) * lr;
  out[13] = (top + bottom) * bt;
  out[14] = (far + near) * nf;
  out[15] = 1;
  return out;
}
/**
 * Generates a look-at matrix with the given eye position, focal point, and up axis.
 * If you want a matrix that actually makes an object look at another object, you should use targetTo instead.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {vec3} eye Position of the viewer
 * @param {vec3} center Point the viewer is looking at
 * @param {vec3} up vec3 pointing up
 * @returns {mat4} out
 */


function lookAt(out, eye, center, up) {
  var x0, x1, x2, y0, y1, y2, z0, z1, z2, len;
  var eyex = eye[0];
  var eyey = eye[1];
  var eyez = eye[2];
  var upx = up[0];
  var upy = up[1];
  var upz = up[2];
  var centerx = center[0];
  var centery = center[1];
  var centerz = center[2];

  if (Math.abs(eyex - centerx) < glMatrix.EPSILON && Math.abs(eyey - centery) < glMatrix.EPSILON && Math.abs(eyez - centerz) < glMatrix.EPSILON) {
    return identity(out);
  }

  z0 = eyex - centerx;
  z1 = eyey - centery;
  z2 = eyez - centerz;
  len = 1 / Math.hypot(z0, z1, z2);
  z0 *= len;
  z1 *= len;
  z2 *= len;
  x0 = upy * z2 - upz * z1;
  x1 = upz * z0 - upx * z2;
  x2 = upx * z1 - upy * z0;
  len = Math.hypot(x0, x1, x2);

  if (!len) {
    x0 = 0;
    x1 = 0;
    x2 = 0;
  } else {
    len = 1 / len;
    x0 *= len;
    x1 *= len;
    x2 *= len;
  }

  y0 = z1 * x2 - z2 * x1;
  y1 = z2 * x0 - z0 * x2;
  y2 = z0 * x1 - z1 * x0;
  len = Math.hypot(y0, y1, y2);

  if (!len) {
    y0 = 0;
    y1 = 0;
    y2 = 0;
  } else {
    len = 1 / len;
    y0 *= len;
    y1 *= len;
    y2 *= len;
  }

  out[0] = x0;
  out[1] = y0;
  out[2] = z0;
  out[3] = 0;
  out[4] = x1;
  out[5] = y1;
  out[6] = z1;
  out[7] = 0;
  out[8] = x2;
  out[9] = y2;
  out[10] = z2;
  out[11] = 0;
  out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
  out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
  out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
  out[15] = 1;
  return out;
}
/**
 * Generates a matrix that makes something look at something else.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {vec3} eye Position of the viewer
 * @param {vec3} center Point the viewer is looking at
 * @param {vec3} up vec3 pointing up
 * @returns {mat4} out
 */


function targetTo(out, eye, target, up) {
  var eyex = eye[0],
      eyey = eye[1],
      eyez = eye[2],
      upx = up[0],
      upy = up[1],
      upz = up[2];
  var z0 = eyex - target[0],
      z1 = eyey - target[1],
      z2 = eyez - target[2];
  var len = z0 * z0 + z1 * z1 + z2 * z2;

  if (len > 0) {
    len = 1 / Math.sqrt(len);
    z0 *= len;
    z1 *= len;
    z2 *= len;
  }

  var x0 = upy * z2 - upz * z1,
      x1 = upz * z0 - upx * z2,
      x2 = upx * z1 - upy * z0;
  len = x0 * x0 + x1 * x1 + x2 * x2;

  if (len > 0) {
    len = 1 / Math.sqrt(len);
    x0 *= len;
    x1 *= len;
    x2 *= len;
  }

  out[0] = x0;
  out[1] = x1;
  out[2] = x2;
  out[3] = 0;
  out[4] = z1 * x2 - z2 * x1;
  out[5] = z2 * x0 - z0 * x2;
  out[6] = z0 * x1 - z1 * x0;
  out[7] = 0;
  out[8] = z0;
  out[9] = z1;
  out[10] = z2;
  out[11] = 0;
  out[12] = eyex;
  out[13] = eyey;
  out[14] = eyez;
  out[15] = 1;
  return out;
}
/**
 * Returns a string representation of a mat4
 *
 * @param {mat4} a matrix to represent as a string
 * @returns {String} string representation of the matrix
 */


function str(a) {
  return "mat4(" + a[0] + ", " + a[1] + ", " + a[2] + ", " + a[3] + ", " + a[4] + ", " + a[5] + ", " + a[6] + ", " + a[7] + ", " + a[8] + ", " + a[9] + ", " + a[10] + ", " + a[11] + ", " + a[12] + ", " + a[13] + ", " + a[14] + ", " + a[15] + ")";
}
/**
 * Returns Frobenius norm of a mat4
 *
 * @param {mat4} a the matrix to calculate Frobenius norm of
 * @returns {Number} Frobenius norm
 */


function frob(a) {
  return Math.hypot(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9], a[10], a[11], a[12], a[13], a[14], a[15]);
}
/**
 * Adds two mat4's
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the first operand
 * @param {mat4} b the second operand
 * @returns {mat4} out
 */


function add(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  out[3] = a[3] + b[3];
  out[4] = a[4] + b[4];
  out[5] = a[5] + b[5];
  out[6] = a[6] + b[6];
  out[7] = a[7] + b[7];
  out[8] = a[8] + b[8];
  out[9] = a[9] + b[9];
  out[10] = a[10] + b[10];
  out[11] = a[11] + b[11];
  out[12] = a[12] + b[12];
  out[13] = a[13] + b[13];
  out[14] = a[14] + b[14];
  out[15] = a[15] + b[15];
  return out;
}
/**
 * Subtracts matrix b from matrix a
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the first operand
 * @param {mat4} b the second operand
 * @returns {mat4} out
 */


function subtract(out, a, b) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  out[3] = a[3] - b[3];
  out[4] = a[4] - b[4];
  out[5] = a[5] - b[5];
  out[6] = a[6] - b[6];
  out[7] = a[7] - b[7];
  out[8] = a[8] - b[8];
  out[9] = a[9] - b[9];
  out[10] = a[10] - b[10];
  out[11] = a[11] - b[11];
  out[12] = a[12] - b[12];
  out[13] = a[13] - b[13];
  out[14] = a[14] - b[14];
  out[15] = a[15] - b[15];
  return out;
}
/**
 * Multiply each element of the matrix by a scalar.
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to scale
 * @param {Number} b amount to scale the matrix's elements by
 * @returns {mat4} out
 */


function multiplyScalar(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  out[2] = a[2] * b;
  out[3] = a[3] * b;
  out[4] = a[4] * b;
  out[5] = a[5] * b;
  out[6] = a[6] * b;
  out[7] = a[7] * b;
  out[8] = a[8] * b;
  out[9] = a[9] * b;
  out[10] = a[10] * b;
  out[11] = a[11] * b;
  out[12] = a[12] * b;
  out[13] = a[13] * b;
  out[14] = a[14] * b;
  out[15] = a[15] * b;
  return out;
}
/**
 * Adds two mat4's after multiplying each element of the second operand by a scalar value.
 *
 * @param {mat4} out the receiving vector
 * @param {mat4} a the first operand
 * @param {mat4} b the second operand
 * @param {Number} scale the amount to scale b's elements by before adding
 * @returns {mat4} out
 */


function multiplyScalarAndAdd(out, a, b, scale) {
  out[0] = a[0] + b[0] * scale;
  out[1] = a[1] + b[1] * scale;
  out[2] = a[2] + b[2] * scale;
  out[3] = a[3] + b[3] * scale;
  out[4] = a[4] + b[4] * scale;
  out[5] = a[5] + b[5] * scale;
  out[6] = a[6] + b[6] * scale;
  out[7] = a[7] + b[7] * scale;
  out[8] = a[8] + b[8] * scale;
  out[9] = a[9] + b[9] * scale;
  out[10] = a[10] + b[10] * scale;
  out[11] = a[11] + b[11] * scale;
  out[12] = a[12] + b[12] * scale;
  out[13] = a[13] + b[13] * scale;
  out[14] = a[14] + b[14] * scale;
  out[15] = a[15] + b[15] * scale;
  return out;
}
/**
 * Returns whether or not the matrices have exactly the same elements in the same position (when compared with ===)
 *
 * @param {mat4} a The first matrix.
 * @param {mat4} b The second matrix.
 * @returns {Boolean} True if the matrices are equal, false otherwise.
 */


function exactEquals(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3] && a[4] === b[4] && a[5] === b[5] && a[6] === b[6] && a[7] === b[7] && a[8] === b[8] && a[9] === b[9] && a[10] === b[10] && a[11] === b[11] && a[12] === b[12] && a[13] === b[13] && a[14] === b[14] && a[15] === b[15];
}
/**
 * Returns whether or not the matrices have approximately the same elements in the same position.
 *
 * @param {mat4} a The first matrix.
 * @param {mat4} b The second matrix.
 * @returns {Boolean} True if the matrices are equal, false otherwise.
 */


function equals(a, b) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3];
  var a4 = a[4],
      a5 = a[5],
      a6 = a[6],
      a7 = a[7];
  var a8 = a[8],
      a9 = a[9],
      a10 = a[10],
      a11 = a[11];
  var a12 = a[12],
      a13 = a[13],
      a14 = a[14],
      a15 = a[15];
  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3];
  var b4 = b[4],
      b5 = b[5],
      b6 = b[6],
      b7 = b[7];
  var b8 = b[8],
      b9 = b[9],
      b10 = b[10],
      b11 = b[11];
  var b12 = b[12],
      b13 = b[13],
      b14 = b[14],
      b15 = b[15];
  return Math.abs(a0 - b0) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a3), Math.abs(b3)) && Math.abs(a4 - b4) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a4), Math.abs(b4)) && Math.abs(a5 - b5) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a5), Math.abs(b5)) && Math.abs(a6 - b6) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a6), Math.abs(b6)) && Math.abs(a7 - b7) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a7), Math.abs(b7)) && Math.abs(a8 - b8) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a8), Math.abs(b8)) && Math.abs(a9 - b9) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a9), Math.abs(b9)) && Math.abs(a10 - b10) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a10), Math.abs(b10)) && Math.abs(a11 - b11) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a11), Math.abs(b11)) && Math.abs(a12 - b12) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a12), Math.abs(b12)) && Math.abs(a13 - b13) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a13), Math.abs(b13)) && Math.abs(a14 - b14) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a14), Math.abs(b14)) && Math.abs(a15 - b15) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a15), Math.abs(b15));
}
/**
 * Alias for {@link mat4.multiply}
 * @function
 */


var mul = multiply;
/**
 * Alias for {@link mat4.subtract}
 * @function
 */

exports.mul = mul;
var sub = subtract;
exports.sub = sub;
},{"./common.js":2}],8:[function(require,module,exports){
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.create = create;
exports.identity = identity;
exports.setAxisAngle = setAxisAngle;
exports.getAxisAngle = getAxisAngle;
exports.getAngle = getAngle;
exports.multiply = multiply;
exports.rotateX = rotateX;
exports.rotateY = rotateY;
exports.rotateZ = rotateZ;
exports.calculateW = calculateW;
exports.exp = exp;
exports.ln = ln;
exports.pow = pow;
exports.slerp = slerp;
exports.random = random;
exports.invert = invert;
exports.conjugate = conjugate;
exports.fromMat3 = fromMat3;
exports.fromEuler = fromEuler;
exports.str = str;
exports.setAxes = exports.sqlerp = exports.rotationTo = exports.equals = exports.exactEquals = exports.normalize = exports.sqrLen = exports.squaredLength = exports.len = exports.length = exports.lerp = exports.dot = exports.scale = exports.mul = exports.add = exports.set = exports.copy = exports.fromValues = exports.clone = void 0;

var glMatrix = _interopRequireWildcard(require("./common.js"));

var mat3 = _interopRequireWildcard(require("./mat3.js"));

var vec3 = _interopRequireWildcard(require("./vec3.js"));

var vec4 = _interopRequireWildcard(require("./vec4.js"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function _getRequireWildcardCache() { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

/**
 * Quaternion
 * @module quat
 */

/**
 * Creates a new identity quat
 *
 * @returns {quat} a new quaternion
 */
function create() {
  var out = new glMatrix.ARRAY_TYPE(4);

  if (glMatrix.ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
  }

  out[3] = 1;
  return out;
}
/**
 * Set a quat to the identity quaternion
 *
 * @param {quat} out the receiving quaternion
 * @returns {quat} out
 */


function identity(out) {
  out[0] = 0;
  out[1] = 0;
  out[2] = 0;
  out[3] = 1;
  return out;
}
/**
 * Sets a quat from the given angle and rotation axis,
 * then returns it.
 *
 * @param {quat} out the receiving quaternion
 * @param {vec3} axis the axis around which to rotate
 * @param {Number} rad the angle in radians
 * @returns {quat} out
 **/


function setAxisAngle(out, axis, rad) {
  rad = rad * 0.5;
  var s = Math.sin(rad);
  out[0] = s * axis[0];
  out[1] = s * axis[1];
  out[2] = s * axis[2];
  out[3] = Math.cos(rad);
  return out;
}
/**
 * Gets the rotation axis and angle for a given
 *  quaternion. If a quaternion is created with
 *  setAxisAngle, this method will return the same
 *  values as providied in the original parameter list
 *  OR functionally equivalent values.
 * Example: The quaternion formed by axis [0, 0, 1] and
 *  angle -90 is the same as the quaternion formed by
 *  [0, 0, 1] and 270. This method favors the latter.
 * @param  {vec3} out_axis  Vector receiving the axis of rotation
 * @param  {quat} q     Quaternion to be decomposed
 * @return {Number}     Angle, in radians, of the rotation
 */


function getAxisAngle(out_axis, q) {
  var rad = Math.acos(q[3]) * 2.0;
  var s = Math.sin(rad / 2.0);

  if (s > glMatrix.EPSILON) {
    out_axis[0] = q[0] / s;
    out_axis[1] = q[1] / s;
    out_axis[2] = q[2] / s;
  } else {
    // If s is zero, return any axis (no rotation - axis does not matter)
    out_axis[0] = 1;
    out_axis[1] = 0;
    out_axis[2] = 0;
  }

  return rad;
}
/**
 * Gets the angular distance between two unit quaternions
 *
 * @param  {quat} a     Origin unit quaternion
 * @param  {quat} b     Destination unit quaternion
 * @return {Number}     Angle, in radians, between the two quaternions
 */


function getAngle(a, b) {
  var dotproduct = dot(a, b);
  return Math.acos(2 * dotproduct * dotproduct - 1);
}
/**
 * Multiplies two quat's
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a the first operand
 * @param {quat} b the second operand
 * @returns {quat} out
 */


function multiply(out, a, b) {
  var ax = a[0],
      ay = a[1],
      az = a[2],
      aw = a[3];
  var bx = b[0],
      by = b[1],
      bz = b[2],
      bw = b[3];
  out[0] = ax * bw + aw * bx + ay * bz - az * by;
  out[1] = ay * bw + aw * by + az * bx - ax * bz;
  out[2] = az * bw + aw * bz + ax * by - ay * bx;
  out[3] = aw * bw - ax * bx - ay * by - az * bz;
  return out;
}
/**
 * Rotates a quaternion by the given angle about the X axis
 *
 * @param {quat} out quat receiving operation result
 * @param {quat} a quat to rotate
 * @param {number} rad angle (in radians) to rotate
 * @returns {quat} out
 */


function rotateX(out, a, rad) {
  rad *= 0.5;
  var ax = a[0],
      ay = a[1],
      az = a[2],
      aw = a[3];
  var bx = Math.sin(rad),
      bw = Math.cos(rad);
  out[0] = ax * bw + aw * bx;
  out[1] = ay * bw + az * bx;
  out[2] = az * bw - ay * bx;
  out[3] = aw * bw - ax * bx;
  return out;
}
/**
 * Rotates a quaternion by the given angle about the Y axis
 *
 * @param {quat} out quat receiving operation result
 * @param {quat} a quat to rotate
 * @param {number} rad angle (in radians) to rotate
 * @returns {quat} out
 */


function rotateY(out, a, rad) {
  rad *= 0.5;
  var ax = a[0],
      ay = a[1],
      az = a[2],
      aw = a[3];
  var by = Math.sin(rad),
      bw = Math.cos(rad);
  out[0] = ax * bw - az * by;
  out[1] = ay * bw + aw * by;
  out[2] = az * bw + ax * by;
  out[3] = aw * bw - ay * by;
  return out;
}
/**
 * Rotates a quaternion by the given angle about the Z axis
 *
 * @param {quat} out quat receiving operation result
 * @param {quat} a quat to rotate
 * @param {number} rad angle (in radians) to rotate
 * @returns {quat} out
 */


function rotateZ(out, a, rad) {
  rad *= 0.5;
  var ax = a[0],
      ay = a[1],
      az = a[2],
      aw = a[3];
  var bz = Math.sin(rad),
      bw = Math.cos(rad);
  out[0] = ax * bw + ay * bz;
  out[1] = ay * bw - ax * bz;
  out[2] = az * bw + aw * bz;
  out[3] = aw * bw - az * bz;
  return out;
}
/**
 * Calculates the W component of a quat from the X, Y, and Z components.
 * Assumes that quaternion is 1 unit in length.
 * Any existing W component will be ignored.
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a quat to calculate W component of
 * @returns {quat} out
 */


function calculateW(out, a) {
  var x = a[0],
      y = a[1],
      z = a[2];
  out[0] = x;
  out[1] = y;
  out[2] = z;
  out[3] = Math.sqrt(Math.abs(1.0 - x * x - y * y - z * z));
  return out;
}
/**
 * Calculate the exponential of a unit quaternion.
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a quat to calculate the exponential of
 * @returns {quat} out
 */


function exp(out, a) {
  var x = a[0],
      y = a[1],
      z = a[2],
      w = a[3];
  var r = Math.sqrt(x * x + y * y + z * z);
  var et = Math.exp(w);
  var s = r > 0 ? et * Math.sin(r) / r : 0;
  out[0] = x * s;
  out[1] = y * s;
  out[2] = z * s;
  out[3] = et * Math.cos(r);
  return out;
}
/**
 * Calculate the natural logarithm of a unit quaternion.
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a quat to calculate the exponential of
 * @returns {quat} out
 */


function ln(out, a) {
  var x = a[0],
      y = a[1],
      z = a[2],
      w = a[3];
  var r = Math.sqrt(x * x + y * y + z * z);
  var t = r > 0 ? Math.atan2(r, w) / r : 0;
  out[0] = x * t;
  out[1] = y * t;
  out[2] = z * t;
  out[3] = 0.5 * Math.log(x * x + y * y + z * z + w * w);
  return out;
}
/**
 * Calculate the scalar power of a unit quaternion.
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a quat to calculate the exponential of
 * @param {Number} b amount to scale the quaternion by
 * @returns {quat} out
 */


function pow(out, a, b) {
  ln(out, a);
  scale(out, out, b);
  exp(out, out);
  return out;
}
/**
 * Performs a spherical linear interpolation between two quat
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a the first operand
 * @param {quat} b the second operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {quat} out
 */


function slerp(out, a, b, t) {
  // benchmarks:
  //    http://jsperf.com/quaternion-slerp-implementations
  var ax = a[0],
      ay = a[1],
      az = a[2],
      aw = a[3];
  var bx = b[0],
      by = b[1],
      bz = b[2],
      bw = b[3];
  var omega, cosom, sinom, scale0, scale1; // calc cosine

  cosom = ax * bx + ay * by + az * bz + aw * bw; // adjust signs (if necessary)

  if (cosom < 0.0) {
    cosom = -cosom;
    bx = -bx;
    by = -by;
    bz = -bz;
    bw = -bw;
  } // calculate coefficients


  if (1.0 - cosom > glMatrix.EPSILON) {
    // standard case (slerp)
    omega = Math.acos(cosom);
    sinom = Math.sin(omega);
    scale0 = Math.sin((1.0 - t) * omega) / sinom;
    scale1 = Math.sin(t * omega) / sinom;
  } else {
    // "from" and "to" quaternions are very close
    //  ... so we can do a linear interpolation
    scale0 = 1.0 - t;
    scale1 = t;
  } // calculate final values


  out[0] = scale0 * ax + scale1 * bx;
  out[1] = scale0 * ay + scale1 * by;
  out[2] = scale0 * az + scale1 * bz;
  out[3] = scale0 * aw + scale1 * bw;
  return out;
}
/**
 * Generates a random unit quaternion
 *
 * @param {quat} out the receiving quaternion
 * @returns {quat} out
 */


function random(out) {
  // Implementation of http://planning.cs.uiuc.edu/node198.html
  // TODO: Calling random 3 times is probably not the fastest solution
  var u1 = glMatrix.RANDOM();
  var u2 = glMatrix.RANDOM();
  var u3 = glMatrix.RANDOM();
  var sqrt1MinusU1 = Math.sqrt(1 - u1);
  var sqrtU1 = Math.sqrt(u1);
  out[0] = sqrt1MinusU1 * Math.sin(2.0 * Math.PI * u2);
  out[1] = sqrt1MinusU1 * Math.cos(2.0 * Math.PI * u2);
  out[2] = sqrtU1 * Math.sin(2.0 * Math.PI * u3);
  out[3] = sqrtU1 * Math.cos(2.0 * Math.PI * u3);
  return out;
}
/**
 * Calculates the inverse of a quat
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a quat to calculate inverse of
 * @returns {quat} out
 */


function invert(out, a) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3];
  var dot = a0 * a0 + a1 * a1 + a2 * a2 + a3 * a3;
  var invDot = dot ? 1.0 / dot : 0; // TODO: Would be faster to return [0,0,0,0] immediately if dot == 0

  out[0] = -a0 * invDot;
  out[1] = -a1 * invDot;
  out[2] = -a2 * invDot;
  out[3] = a3 * invDot;
  return out;
}
/**
 * Calculates the conjugate of a quat
 * If the quaternion is normalized, this function is faster than quat.inverse and produces the same result.
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a quat to calculate conjugate of
 * @returns {quat} out
 */


function conjugate(out, a) {
  out[0] = -a[0];
  out[1] = -a[1];
  out[2] = -a[2];
  out[3] = a[3];
  return out;
}
/**
 * Creates a quaternion from the given 3x3 rotation matrix.
 *
 * NOTE: The resultant quaternion is not normalized, so you should be sure
 * to renormalize the quaternion yourself where necessary.
 *
 * @param {quat} out the receiving quaternion
 * @param {mat3} m rotation matrix
 * @returns {quat} out
 * @function
 */


function fromMat3(out, m) {
  // Algorithm in Ken Shoemake's article in 1987 SIGGRAPH course notes
  // article "Quaternion Calculus and Fast Animation".
  var fTrace = m[0] + m[4] + m[8];
  var fRoot;

  if (fTrace > 0.0) {
    // |w| > 1/2, may as well choose w > 1/2
    fRoot = Math.sqrt(fTrace + 1.0); // 2w

    out[3] = 0.5 * fRoot;
    fRoot = 0.5 / fRoot; // 1/(4w)

    out[0] = (m[5] - m[7]) * fRoot;
    out[1] = (m[6] - m[2]) * fRoot;
    out[2] = (m[1] - m[3]) * fRoot;
  } else {
    // |w| <= 1/2
    var i = 0;
    if (m[4] > m[0]) i = 1;
    if (m[8] > m[i * 3 + i]) i = 2;
    var j = (i + 1) % 3;
    var k = (i + 2) % 3;
    fRoot = Math.sqrt(m[i * 3 + i] - m[j * 3 + j] - m[k * 3 + k] + 1.0);
    out[i] = 0.5 * fRoot;
    fRoot = 0.5 / fRoot;
    out[3] = (m[j * 3 + k] - m[k * 3 + j]) * fRoot;
    out[j] = (m[j * 3 + i] + m[i * 3 + j]) * fRoot;
    out[k] = (m[k * 3 + i] + m[i * 3 + k]) * fRoot;
  }

  return out;
}
/**
 * Creates a quaternion from the given euler angle x, y, z.
 *
 * @param {quat} out the receiving quaternion
 * @param {x} Angle to rotate around X axis in degrees.
 * @param {y} Angle to rotate around Y axis in degrees.
 * @param {z} Angle to rotate around Z axis in degrees.
 * @returns {quat} out
 * @function
 */


function fromEuler(out, x, y, z) {
  var halfToRad = 0.5 * Math.PI / 180.0;
  x *= halfToRad;
  y *= halfToRad;
  z *= halfToRad;
  var sx = Math.sin(x);
  var cx = Math.cos(x);
  var sy = Math.sin(y);
  var cy = Math.cos(y);
  var sz = Math.sin(z);
  var cz = Math.cos(z);
  out[0] = sx * cy * cz - cx * sy * sz;
  out[1] = cx * sy * cz + sx * cy * sz;
  out[2] = cx * cy * sz - sx * sy * cz;
  out[3] = cx * cy * cz + sx * sy * sz;
  return out;
}
/**
 * Returns a string representation of a quatenion
 *
 * @param {quat} a vector to represent as a string
 * @returns {String} string representation of the vector
 */


function str(a) {
  return "quat(" + a[0] + ", " + a[1] + ", " + a[2] + ", " + a[3] + ")";
}
/**
 * Creates a new quat initialized with values from an existing quaternion
 *
 * @param {quat} a quaternion to clone
 * @returns {quat} a new quaternion
 * @function
 */


var clone = vec4.clone;
/**
 * Creates a new quat initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {quat} a new quaternion
 * @function
 */

exports.clone = clone;
var fromValues = vec4.fromValues;
/**
 * Copy the values from one quat to another
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a the source quaternion
 * @returns {quat} out
 * @function
 */

exports.fromValues = fromValues;
var copy = vec4.copy;
/**
 * Set the components of a quat to the given values
 *
 * @param {quat} out the receiving quaternion
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {quat} out
 * @function
 */

exports.copy = copy;
var set = vec4.set;
/**
 * Adds two quat's
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a the first operand
 * @param {quat} b the second operand
 * @returns {quat} out
 * @function
 */

exports.set = set;
var add = vec4.add;
/**
 * Alias for {@link quat.multiply}
 * @function
 */

exports.add = add;
var mul = multiply;
/**
 * Scales a quat by a scalar number
 *
 * @param {quat} out the receiving vector
 * @param {quat} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {quat} out
 * @function
 */

exports.mul = mul;
var scale = vec4.scale;
/**
 * Calculates the dot product of two quat's
 *
 * @param {quat} a the first operand
 * @param {quat} b the second operand
 * @returns {Number} dot product of a and b
 * @function
 */

exports.scale = scale;
var dot = vec4.dot;
/**
 * Performs a linear interpolation between two quat's
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a the first operand
 * @param {quat} b the second operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {quat} out
 * @function
 */

exports.dot = dot;
var lerp = vec4.lerp;
/**
 * Calculates the length of a quat
 *
 * @param {quat} a vector to calculate length of
 * @returns {Number} length of a
 */

exports.lerp = lerp;
var length = vec4.length;
/**
 * Alias for {@link quat.length}
 * @function
 */

exports.length = length;
var len = length;
/**
 * Calculates the squared length of a quat
 *
 * @param {quat} a vector to calculate squared length of
 * @returns {Number} squared length of a
 * @function
 */

exports.len = len;
var squaredLength = vec4.squaredLength;
/**
 * Alias for {@link quat.squaredLength}
 * @function
 */

exports.squaredLength = squaredLength;
var sqrLen = squaredLength;
/**
 * Normalize a quat
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a quaternion to normalize
 * @returns {quat} out
 * @function
 */

exports.sqrLen = sqrLen;
var normalize = vec4.normalize;
/**
 * Returns whether or not the quaternions have exactly the same elements in the same position (when compared with ===)
 *
 * @param {quat} a The first quaternion.
 * @param {quat} b The second quaternion.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */

exports.normalize = normalize;
var exactEquals = vec4.exactEquals;
/**
 * Returns whether or not the quaternions have approximately the same elements in the same position.
 *
 * @param {quat} a The first vector.
 * @param {quat} b The second vector.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */

exports.exactEquals = exactEquals;
var equals = vec4.equals;
/**
 * Sets a quaternion to represent the shortest rotation from one
 * vector to another.
 *
 * Both vectors are assumed to be unit length.
 *
 * @param {quat} out the receiving quaternion.
 * @param {vec3} a the initial vector
 * @param {vec3} b the destination vector
 * @returns {quat} out
 */

exports.equals = equals;

var rotationTo = function () {
  var tmpvec3 = vec3.create();
  var xUnitVec3 = vec3.fromValues(1, 0, 0);
  var yUnitVec3 = vec3.fromValues(0, 1, 0);
  return function (out, a, b) {
    var dot = vec3.dot(a, b);

    if (dot < -0.999999) {
      vec3.cross(tmpvec3, xUnitVec3, a);
      if (vec3.len(tmpvec3) < 0.000001) vec3.cross(tmpvec3, yUnitVec3, a);
      vec3.normalize(tmpvec3, tmpvec3);
      setAxisAngle(out, tmpvec3, Math.PI);
      return out;
    } else if (dot > 0.999999) {
      out[0] = 0;
      out[1] = 0;
      out[2] = 0;
      out[3] = 1;
      return out;
    } else {
      vec3.cross(tmpvec3, a, b);
      out[0] = tmpvec3[0];
      out[1] = tmpvec3[1];
      out[2] = tmpvec3[2];
      out[3] = 1 + dot;
      return normalize(out, out);
    }
  };
}();
/**
 * Performs a spherical linear interpolation with two control points
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a the first operand
 * @param {quat} b the second operand
 * @param {quat} c the third operand
 * @param {quat} d the fourth operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {quat} out
 */


exports.rotationTo = rotationTo;

var sqlerp = function () {
  var temp1 = create();
  var temp2 = create();
  return function (out, a, b, c, d, t) {
    slerp(temp1, a, d, t);
    slerp(temp2, b, c, t);
    slerp(out, temp1, temp2, 2 * t * (1 - t));
    return out;
  };
}();
/**
 * Sets the specified quaternion with values corresponding to the given
 * axes. Each axis is a vec3 and is expected to be unit length and
 * perpendicular to all other specified axes.
 *
 * @param {vec3} view  the vector representing the viewing direction
 * @param {vec3} right the vector representing the local "right" direction
 * @param {vec3} up    the vector representing the local "up" direction
 * @returns {quat} out
 */


exports.sqlerp = sqlerp;

var setAxes = function () {
  var matr = mat3.create();
  return function (out, view, right, up) {
    matr[0] = right[0];
    matr[3] = right[1];
    matr[6] = right[2];
    matr[1] = up[0];
    matr[4] = up[1];
    matr[7] = up[2];
    matr[2] = -view[0];
    matr[5] = -view[1];
    matr[8] = -view[2];
    return normalize(out, fromMat3(out, matr));
  };
}();

exports.setAxes = setAxes;
},{"./common.js":2,"./mat3.js":6,"./vec3.js":11,"./vec4.js":12}],9:[function(require,module,exports){
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.create = create;
exports.clone = clone;
exports.fromValues = fromValues;
exports.fromRotationTranslationValues = fromRotationTranslationValues;
exports.fromRotationTranslation = fromRotationTranslation;
exports.fromTranslation = fromTranslation;
exports.fromRotation = fromRotation;
exports.fromMat4 = fromMat4;
exports.copy = copy;
exports.identity = identity;
exports.set = set;
exports.getDual = getDual;
exports.setDual = setDual;
exports.getTranslation = getTranslation;
exports.translate = translate;
exports.rotateX = rotateX;
exports.rotateY = rotateY;
exports.rotateZ = rotateZ;
exports.rotateByQuatAppend = rotateByQuatAppend;
exports.rotateByQuatPrepend = rotateByQuatPrepend;
exports.rotateAroundAxis = rotateAroundAxis;
exports.add = add;
exports.multiply = multiply;
exports.scale = scale;
exports.lerp = lerp;
exports.invert = invert;
exports.conjugate = conjugate;
exports.normalize = normalize;
exports.str = str;
exports.exactEquals = exactEquals;
exports.equals = equals;
exports.sqrLen = exports.squaredLength = exports.len = exports.length = exports.dot = exports.mul = exports.setReal = exports.getReal = void 0;

var glMatrix = _interopRequireWildcard(require("./common.js"));

var quat = _interopRequireWildcard(require("./quat.js"));

var mat4 = _interopRequireWildcard(require("./mat4.js"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function _getRequireWildcardCache() { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

/**
 * Dual Quaternion<br>
 * Format: [real, dual]<br>
 * Quaternion format: XYZW<br>
 * Make sure to have normalized dual quaternions, otherwise the functions may not work as intended.<br>
 * @module quat2
 */

/**
 * Creates a new identity dual quat
 *
 * @returns {quat2} a new dual quaternion [real -> rotation, dual -> translation]
 */
function create() {
  var dq = new glMatrix.ARRAY_TYPE(8);

  if (glMatrix.ARRAY_TYPE != Float32Array) {
    dq[0] = 0;
    dq[1] = 0;
    dq[2] = 0;
    dq[4] = 0;
    dq[5] = 0;
    dq[6] = 0;
    dq[7] = 0;
  }

  dq[3] = 1;
  return dq;
}
/**
 * Creates a new quat initialized with values from an existing quaternion
 *
 * @param {quat2} a dual quaternion to clone
 * @returns {quat2} new dual quaternion
 * @function
 */


function clone(a) {
  var dq = new glMatrix.ARRAY_TYPE(8);
  dq[0] = a[0];
  dq[1] = a[1];
  dq[2] = a[2];
  dq[3] = a[3];
  dq[4] = a[4];
  dq[5] = a[5];
  dq[6] = a[6];
  dq[7] = a[7];
  return dq;
}
/**
 * Creates a new dual quat initialized with the given values
 *
 * @param {Number} x1 X component
 * @param {Number} y1 Y component
 * @param {Number} z1 Z component
 * @param {Number} w1 W component
 * @param {Number} x2 X component
 * @param {Number} y2 Y component
 * @param {Number} z2 Z component
 * @param {Number} w2 W component
 * @returns {quat2} new dual quaternion
 * @function
 */


function fromValues(x1, y1, z1, w1, x2, y2, z2, w2) {
  var dq = new glMatrix.ARRAY_TYPE(8);
  dq[0] = x1;
  dq[1] = y1;
  dq[2] = z1;
  dq[3] = w1;
  dq[4] = x2;
  dq[5] = y2;
  dq[6] = z2;
  dq[7] = w2;
  return dq;
}
/**
 * Creates a new dual quat from the given values (quat and translation)
 *
 * @param {Number} x1 X component
 * @param {Number} y1 Y component
 * @param {Number} z1 Z component
 * @param {Number} w1 W component
 * @param {Number} x2 X component (translation)
 * @param {Number} y2 Y component (translation)
 * @param {Number} z2 Z component (translation)
 * @returns {quat2} new dual quaternion
 * @function
 */


function fromRotationTranslationValues(x1, y1, z1, w1, x2, y2, z2) {
  var dq = new glMatrix.ARRAY_TYPE(8);
  dq[0] = x1;
  dq[1] = y1;
  dq[2] = z1;
  dq[3] = w1;
  var ax = x2 * 0.5,
      ay = y2 * 0.5,
      az = z2 * 0.5;
  dq[4] = ax * w1 + ay * z1 - az * y1;
  dq[5] = ay * w1 + az * x1 - ax * z1;
  dq[6] = az * w1 + ax * y1 - ay * x1;
  dq[7] = -ax * x1 - ay * y1 - az * z1;
  return dq;
}
/**
 * Creates a dual quat from a quaternion and a translation
 *
 * @param {quat2} dual quaternion receiving operation result
 * @param {quat} q a normalized quaternion
 * @param {vec3} t tranlation vector
 * @returns {quat2} dual quaternion receiving operation result
 * @function
 */


function fromRotationTranslation(out, q, t) {
  var ax = t[0] * 0.5,
      ay = t[1] * 0.5,
      az = t[2] * 0.5,
      bx = q[0],
      by = q[1],
      bz = q[2],
      bw = q[3];
  out[0] = bx;
  out[1] = by;
  out[2] = bz;
  out[3] = bw;
  out[4] = ax * bw + ay * bz - az * by;
  out[5] = ay * bw + az * bx - ax * bz;
  out[6] = az * bw + ax * by - ay * bx;
  out[7] = -ax * bx - ay * by - az * bz;
  return out;
}
/**
 * Creates a dual quat from a translation
 *
 * @param {quat2} dual quaternion receiving operation result
 * @param {vec3} t translation vector
 * @returns {quat2} dual quaternion receiving operation result
 * @function
 */


function fromTranslation(out, t) {
  out[0] = 0;
  out[1] = 0;
  out[2] = 0;
  out[3] = 1;
  out[4] = t[0] * 0.5;
  out[5] = t[1] * 0.5;
  out[6] = t[2] * 0.5;
  out[7] = 0;
  return out;
}
/**
 * Creates a dual quat from a quaternion
 *
 * @param {quat2} dual quaternion receiving operation result
 * @param {quat} q the quaternion
 * @returns {quat2} dual quaternion receiving operation result
 * @function
 */


function fromRotation(out, q) {
  out[0] = q[0];
  out[1] = q[1];
  out[2] = q[2];
  out[3] = q[3];
  out[4] = 0;
  out[5] = 0;
  out[6] = 0;
  out[7] = 0;
  return out;
}
/**
 * Creates a new dual quat from a matrix (4x4)
 *
 * @param {quat2} out the dual quaternion
 * @param {mat4} a the matrix
 * @returns {quat2} dual quat receiving operation result
 * @function
 */


function fromMat4(out, a) {
  //TODO Optimize this
  var outer = quat.create();
  mat4.getRotation(outer, a);
  var t = new glMatrix.ARRAY_TYPE(3);
  mat4.getTranslation(t, a);
  fromRotationTranslation(out, outer, t);
  return out;
}
/**
 * Copy the values from one dual quat to another
 *
 * @param {quat2} out the receiving dual quaternion
 * @param {quat2} a the source dual quaternion
 * @returns {quat2} out
 * @function
 */


function copy(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  out[4] = a[4];
  out[5] = a[5];
  out[6] = a[6];
  out[7] = a[7];
  return out;
}
/**
 * Set a dual quat to the identity dual quaternion
 *
 * @param {quat2} out the receiving quaternion
 * @returns {quat2} out
 */


function identity(out) {
  out[0] = 0;
  out[1] = 0;
  out[2] = 0;
  out[3] = 1;
  out[4] = 0;
  out[5] = 0;
  out[6] = 0;
  out[7] = 0;
  return out;
}
/**
 * Set the components of a dual quat to the given values
 *
 * @param {quat2} out the receiving quaternion
 * @param {Number} x1 X component
 * @param {Number} y1 Y component
 * @param {Number} z1 Z component
 * @param {Number} w1 W component
 * @param {Number} x2 X component
 * @param {Number} y2 Y component
 * @param {Number} z2 Z component
 * @param {Number} w2 W component
 * @returns {quat2} out
 * @function
 */


function set(out, x1, y1, z1, w1, x2, y2, z2, w2) {
  out[0] = x1;
  out[1] = y1;
  out[2] = z1;
  out[3] = w1;
  out[4] = x2;
  out[5] = y2;
  out[6] = z2;
  out[7] = w2;
  return out;
}
/**
 * Gets the real part of a dual quat
 * @param  {quat} out real part
 * @param  {quat2} a Dual Quaternion
 * @return {quat} real part
 */


var getReal = quat.copy;
/**
 * Gets the dual part of a dual quat
 * @param  {quat} out dual part
 * @param  {quat2} a Dual Quaternion
 * @return {quat} dual part
 */

exports.getReal = getReal;

function getDual(out, a) {
  out[0] = a[4];
  out[1] = a[5];
  out[2] = a[6];
  out[3] = a[7];
  return out;
}
/**
 * Set the real component of a dual quat to the given quaternion
 *
 * @param {quat2} out the receiving quaternion
 * @param {quat} q a quaternion representing the real part
 * @returns {quat2} out
 * @function
 */


var setReal = quat.copy;
/**
 * Set the dual component of a dual quat to the given quaternion
 *
 * @param {quat2} out the receiving quaternion
 * @param {quat} q a quaternion representing the dual part
 * @returns {quat2} out
 * @function
 */

exports.setReal = setReal;

function setDual(out, q) {
  out[4] = q[0];
  out[5] = q[1];
  out[6] = q[2];
  out[7] = q[3];
  return out;
}
/**
 * Gets the translation of a normalized dual quat
 * @param  {vec3} out translation
 * @param  {quat2} a Dual Quaternion to be decomposed
 * @return {vec3} translation
 */


function getTranslation(out, a) {
  var ax = a[4],
      ay = a[5],
      az = a[6],
      aw = a[7],
      bx = -a[0],
      by = -a[1],
      bz = -a[2],
      bw = a[3];
  out[0] = (ax * bw + aw * bx + ay * bz - az * by) * 2;
  out[1] = (ay * bw + aw * by + az * bx - ax * bz) * 2;
  out[2] = (az * bw + aw * bz + ax * by - ay * bx) * 2;
  return out;
}
/**
 * Translates a dual quat by the given vector
 *
 * @param {quat2} out the receiving dual quaternion
 * @param {quat2} a the dual quaternion to translate
 * @param {vec3} v vector to translate by
 * @returns {quat2} out
 */


function translate(out, a, v) {
  var ax1 = a[0],
      ay1 = a[1],
      az1 = a[2],
      aw1 = a[3],
      bx1 = v[0] * 0.5,
      by1 = v[1] * 0.5,
      bz1 = v[2] * 0.5,
      ax2 = a[4],
      ay2 = a[5],
      az2 = a[6],
      aw2 = a[7];
  out[0] = ax1;
  out[1] = ay1;
  out[2] = az1;
  out[3] = aw1;
  out[4] = aw1 * bx1 + ay1 * bz1 - az1 * by1 + ax2;
  out[5] = aw1 * by1 + az1 * bx1 - ax1 * bz1 + ay2;
  out[6] = aw1 * bz1 + ax1 * by1 - ay1 * bx1 + az2;
  out[7] = -ax1 * bx1 - ay1 * by1 - az1 * bz1 + aw2;
  return out;
}
/**
 * Rotates a dual quat around the X axis
 *
 * @param {quat2} out the receiving dual quaternion
 * @param {quat2} a the dual quaternion to rotate
 * @param {number} rad how far should the rotation be
 * @returns {quat2} out
 */


function rotateX(out, a, rad) {
  var bx = -a[0],
      by = -a[1],
      bz = -a[2],
      bw = a[3],
      ax = a[4],
      ay = a[5],
      az = a[6],
      aw = a[7],
      ax1 = ax * bw + aw * bx + ay * bz - az * by,
      ay1 = ay * bw + aw * by + az * bx - ax * bz,
      az1 = az * bw + aw * bz + ax * by - ay * bx,
      aw1 = aw * bw - ax * bx - ay * by - az * bz;
  quat.rotateX(out, a, rad);
  bx = out[0];
  by = out[1];
  bz = out[2];
  bw = out[3];
  out[4] = ax1 * bw + aw1 * bx + ay1 * bz - az1 * by;
  out[5] = ay1 * bw + aw1 * by + az1 * bx - ax1 * bz;
  out[6] = az1 * bw + aw1 * bz + ax1 * by - ay1 * bx;
  out[7] = aw1 * bw - ax1 * bx - ay1 * by - az1 * bz;
  return out;
}
/**
 * Rotates a dual quat around the Y axis
 *
 * @param {quat2} out the receiving dual quaternion
 * @param {quat2} a the dual quaternion to rotate
 * @param {number} rad how far should the rotation be
 * @returns {quat2} out
 */


function rotateY(out, a, rad) {
  var bx = -a[0],
      by = -a[1],
      bz = -a[2],
      bw = a[3],
      ax = a[4],
      ay = a[5],
      az = a[6],
      aw = a[7],
      ax1 = ax * bw + aw * bx + ay * bz - az * by,
      ay1 = ay * bw + aw * by + az * bx - ax * bz,
      az1 = az * bw + aw * bz + ax * by - ay * bx,
      aw1 = aw * bw - ax * bx - ay * by - az * bz;
  quat.rotateY(out, a, rad);
  bx = out[0];
  by = out[1];
  bz = out[2];
  bw = out[3];
  out[4] = ax1 * bw + aw1 * bx + ay1 * bz - az1 * by;
  out[5] = ay1 * bw + aw1 * by + az1 * bx - ax1 * bz;
  out[6] = az1 * bw + aw1 * bz + ax1 * by - ay1 * bx;
  out[7] = aw1 * bw - ax1 * bx - ay1 * by - az1 * bz;
  return out;
}
/**
 * Rotates a dual quat around the Z axis
 *
 * @param {quat2} out the receiving dual quaternion
 * @param {quat2} a the dual quaternion to rotate
 * @param {number} rad how far should the rotation be
 * @returns {quat2} out
 */


function rotateZ(out, a, rad) {
  var bx = -a[0],
      by = -a[1],
      bz = -a[2],
      bw = a[3],
      ax = a[4],
      ay = a[5],
      az = a[6],
      aw = a[7],
      ax1 = ax * bw + aw * bx + ay * bz - az * by,
      ay1 = ay * bw + aw * by + az * bx - ax * bz,
      az1 = az * bw + aw * bz + ax * by - ay * bx,
      aw1 = aw * bw - ax * bx - ay * by - az * bz;
  quat.rotateZ(out, a, rad);
  bx = out[0];
  by = out[1];
  bz = out[2];
  bw = out[3];
  out[4] = ax1 * bw + aw1 * bx + ay1 * bz - az1 * by;
  out[5] = ay1 * bw + aw1 * by + az1 * bx - ax1 * bz;
  out[6] = az1 * bw + aw1 * bz + ax1 * by - ay1 * bx;
  out[7] = aw1 * bw - ax1 * bx - ay1 * by - az1 * bz;
  return out;
}
/**
 * Rotates a dual quat by a given quaternion (a * q)
 *
 * @param {quat2} out the receiving dual quaternion
 * @param {quat2} a the dual quaternion to rotate
 * @param {quat} q quaternion to rotate by
 * @returns {quat2} out
 */


function rotateByQuatAppend(out, a, q) {
  var qx = q[0],
      qy = q[1],
      qz = q[2],
      qw = q[3],
      ax = a[0],
      ay = a[1],
      az = a[2],
      aw = a[3];
  out[0] = ax * qw + aw * qx + ay * qz - az * qy;
  out[1] = ay * qw + aw * qy + az * qx - ax * qz;
  out[2] = az * qw + aw * qz + ax * qy - ay * qx;
  out[3] = aw * qw - ax * qx - ay * qy - az * qz;
  ax = a[4];
  ay = a[5];
  az = a[6];
  aw = a[7];
  out[4] = ax * qw + aw * qx + ay * qz - az * qy;
  out[5] = ay * qw + aw * qy + az * qx - ax * qz;
  out[6] = az * qw + aw * qz + ax * qy - ay * qx;
  out[7] = aw * qw - ax * qx - ay * qy - az * qz;
  return out;
}
/**
 * Rotates a dual quat by a given quaternion (q * a)
 *
 * @param {quat2} out the receiving dual quaternion
 * @param {quat} q quaternion to rotate by
 * @param {quat2} a the dual quaternion to rotate
 * @returns {quat2} out
 */


function rotateByQuatPrepend(out, q, a) {
  var qx = q[0],
      qy = q[1],
      qz = q[2],
      qw = q[3],
      bx = a[0],
      by = a[1],
      bz = a[2],
      bw = a[3];
  out[0] = qx * bw + qw * bx + qy * bz - qz * by;
  out[1] = qy * bw + qw * by + qz * bx - qx * bz;
  out[2] = qz * bw + qw * bz + qx * by - qy * bx;
  out[3] = qw * bw - qx * bx - qy * by - qz * bz;
  bx = a[4];
  by = a[5];
  bz = a[6];
  bw = a[7];
  out[4] = qx * bw + qw * bx + qy * bz - qz * by;
  out[5] = qy * bw + qw * by + qz * bx - qx * bz;
  out[6] = qz * bw + qw * bz + qx * by - qy * bx;
  out[7] = qw * bw - qx * bx - qy * by - qz * bz;
  return out;
}
/**
 * Rotates a dual quat around a given axis. Does the normalisation automatically
 *
 * @param {quat2} out the receiving dual quaternion
 * @param {quat2} a the dual quaternion to rotate
 * @param {vec3} axis the axis to rotate around
 * @param {Number} rad how far the rotation should be
 * @returns {quat2} out
 */


function rotateAroundAxis(out, a, axis, rad) {
  //Special case for rad = 0
  if (Math.abs(rad) < glMatrix.EPSILON) {
    return copy(out, a);
  }

  var axisLength = Math.hypot(axis[0], axis[1], axis[2]);
  rad = rad * 0.5;
  var s = Math.sin(rad);
  var bx = s * axis[0] / axisLength;
  var by = s * axis[1] / axisLength;
  var bz = s * axis[2] / axisLength;
  var bw = Math.cos(rad);
  var ax1 = a[0],
      ay1 = a[1],
      az1 = a[2],
      aw1 = a[3];
  out[0] = ax1 * bw + aw1 * bx + ay1 * bz - az1 * by;
  out[1] = ay1 * bw + aw1 * by + az1 * bx - ax1 * bz;
  out[2] = az1 * bw + aw1 * bz + ax1 * by - ay1 * bx;
  out[3] = aw1 * bw - ax1 * bx - ay1 * by - az1 * bz;
  var ax = a[4],
      ay = a[5],
      az = a[6],
      aw = a[7];
  out[4] = ax * bw + aw * bx + ay * bz - az * by;
  out[5] = ay * bw + aw * by + az * bx - ax * bz;
  out[6] = az * bw + aw * bz + ax * by - ay * bx;
  out[7] = aw * bw - ax * bx - ay * by - az * bz;
  return out;
}
/**
 * Adds two dual quat's
 *
 * @param {quat2} out the receiving dual quaternion
 * @param {quat2} a the first operand
 * @param {quat2} b the second operand
 * @returns {quat2} out
 * @function
 */


function add(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  out[3] = a[3] + b[3];
  out[4] = a[4] + b[4];
  out[5] = a[5] + b[5];
  out[6] = a[6] + b[6];
  out[7] = a[7] + b[7];
  return out;
}
/**
 * Multiplies two dual quat's
 *
 * @param {quat2} out the receiving dual quaternion
 * @param {quat2} a the first operand
 * @param {quat2} b the second operand
 * @returns {quat2} out
 */


function multiply(out, a, b) {
  var ax0 = a[0],
      ay0 = a[1],
      az0 = a[2],
      aw0 = a[3],
      bx1 = b[4],
      by1 = b[5],
      bz1 = b[6],
      bw1 = b[7],
      ax1 = a[4],
      ay1 = a[5],
      az1 = a[6],
      aw1 = a[7],
      bx0 = b[0],
      by0 = b[1],
      bz0 = b[2],
      bw0 = b[3];
  out[0] = ax0 * bw0 + aw0 * bx0 + ay0 * bz0 - az0 * by0;
  out[1] = ay0 * bw0 + aw0 * by0 + az0 * bx0 - ax0 * bz0;
  out[2] = az0 * bw0 + aw0 * bz0 + ax0 * by0 - ay0 * bx0;
  out[3] = aw0 * bw0 - ax0 * bx0 - ay0 * by0 - az0 * bz0;
  out[4] = ax0 * bw1 + aw0 * bx1 + ay0 * bz1 - az0 * by1 + ax1 * bw0 + aw1 * bx0 + ay1 * bz0 - az1 * by0;
  out[5] = ay0 * bw1 + aw0 * by1 + az0 * bx1 - ax0 * bz1 + ay1 * bw0 + aw1 * by0 + az1 * bx0 - ax1 * bz0;
  out[6] = az0 * bw1 + aw0 * bz1 + ax0 * by1 - ay0 * bx1 + az1 * bw0 + aw1 * bz0 + ax1 * by0 - ay1 * bx0;
  out[7] = aw0 * bw1 - ax0 * bx1 - ay0 * by1 - az0 * bz1 + aw1 * bw0 - ax1 * bx0 - ay1 * by0 - az1 * bz0;
  return out;
}
/**
 * Alias for {@link quat2.multiply}
 * @function
 */


var mul = multiply;
/**
 * Scales a dual quat by a scalar number
 *
 * @param {quat2} out the receiving dual quat
 * @param {quat2} a the dual quat to scale
 * @param {Number} b amount to scale the dual quat by
 * @returns {quat2} out
 * @function
 */

exports.mul = mul;

function scale(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  out[2] = a[2] * b;
  out[3] = a[3] * b;
  out[4] = a[4] * b;
  out[5] = a[5] * b;
  out[6] = a[6] * b;
  out[7] = a[7] * b;
  return out;
}
/**
 * Calculates the dot product of two dual quat's (The dot product of the real parts)
 *
 * @param {quat2} a the first operand
 * @param {quat2} b the second operand
 * @returns {Number} dot product of a and b
 * @function
 */


var dot = quat.dot;
/**
 * Performs a linear interpolation between two dual quats's
 * NOTE: The resulting dual quaternions won't always be normalized (The error is most noticeable when t = 0.5)
 *
 * @param {quat2} out the receiving dual quat
 * @param {quat2} a the first operand
 * @param {quat2} b the second operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {quat2} out
 */

exports.dot = dot;

function lerp(out, a, b, t) {
  var mt = 1 - t;
  if (dot(a, b) < 0) t = -t;
  out[0] = a[0] * mt + b[0] * t;
  out[1] = a[1] * mt + b[1] * t;
  out[2] = a[2] * mt + b[2] * t;
  out[3] = a[3] * mt + b[3] * t;
  out[4] = a[4] * mt + b[4] * t;
  out[5] = a[5] * mt + b[5] * t;
  out[6] = a[6] * mt + b[6] * t;
  out[7] = a[7] * mt + b[7] * t;
  return out;
}
/**
 * Calculates the inverse of a dual quat. If they are normalized, conjugate is cheaper
 *
 * @param {quat2} out the receiving dual quaternion
 * @param {quat2} a dual quat to calculate inverse of
 * @returns {quat2} out
 */


function invert(out, a) {
  var sqlen = squaredLength(a);
  out[0] = -a[0] / sqlen;
  out[1] = -a[1] / sqlen;
  out[2] = -a[2] / sqlen;
  out[3] = a[3] / sqlen;
  out[4] = -a[4] / sqlen;
  out[5] = -a[5] / sqlen;
  out[6] = -a[6] / sqlen;
  out[7] = a[7] / sqlen;
  return out;
}
/**
 * Calculates the conjugate of a dual quat
 * If the dual quaternion is normalized, this function is faster than quat2.inverse and produces the same result.
 *
 * @param {quat2} out the receiving quaternion
 * @param {quat2} a quat to calculate conjugate of
 * @returns {quat2} out
 */


function conjugate(out, a) {
  out[0] = -a[0];
  out[1] = -a[1];
  out[2] = -a[2];
  out[3] = a[3];
  out[4] = -a[4];
  out[5] = -a[5];
  out[6] = -a[6];
  out[7] = a[7];
  return out;
}
/**
 * Calculates the length of a dual quat
 *
 * @param {quat2} a dual quat to calculate length of
 * @returns {Number} length of a
 * @function
 */


var length = quat.length;
/**
 * Alias for {@link quat2.length}
 * @function
 */

exports.length = length;
var len = length;
/**
 * Calculates the squared length of a dual quat
 *
 * @param {quat2} a dual quat to calculate squared length of
 * @returns {Number} squared length of a
 * @function
 */

exports.len = len;
var squaredLength = quat.squaredLength;
/**
 * Alias for {@link quat2.squaredLength}
 * @function
 */

exports.squaredLength = squaredLength;
var sqrLen = squaredLength;
/**
 * Normalize a dual quat
 *
 * @param {quat2} out the receiving dual quaternion
 * @param {quat2} a dual quaternion to normalize
 * @returns {quat2} out
 * @function
 */

exports.sqrLen = sqrLen;

function normalize(out, a) {
  var magnitude = squaredLength(a);

  if (magnitude > 0) {
    magnitude = Math.sqrt(magnitude);
    var a0 = a[0] / magnitude;
    var a1 = a[1] / magnitude;
    var a2 = a[2] / magnitude;
    var a3 = a[3] / magnitude;
    var b0 = a[4];
    var b1 = a[5];
    var b2 = a[6];
    var b3 = a[7];
    var a_dot_b = a0 * b0 + a1 * b1 + a2 * b2 + a3 * b3;
    out[0] = a0;
    out[1] = a1;
    out[2] = a2;
    out[3] = a3;
    out[4] = (b0 - a0 * a_dot_b) / magnitude;
    out[5] = (b1 - a1 * a_dot_b) / magnitude;
    out[6] = (b2 - a2 * a_dot_b) / magnitude;
    out[7] = (b3 - a3 * a_dot_b) / magnitude;
  }

  return out;
}
/**
 * Returns a string representation of a dual quatenion
 *
 * @param {quat2} a dual quaternion to represent as a string
 * @returns {String} string representation of the dual quat
 */


function str(a) {
  return "quat2(" + a[0] + ", " + a[1] + ", " + a[2] + ", " + a[3] + ", " + a[4] + ", " + a[5] + ", " + a[6] + ", " + a[7] + ")";
}
/**
 * Returns whether or not the dual quaternions have exactly the same elements in the same position (when compared with ===)
 *
 * @param {quat2} a the first dual quaternion.
 * @param {quat2} b the second dual quaternion.
 * @returns {Boolean} true if the dual quaternions are equal, false otherwise.
 */


function exactEquals(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3] && a[4] === b[4] && a[5] === b[5] && a[6] === b[6] && a[7] === b[7];
}
/**
 * Returns whether or not the dual quaternions have approximately the same elements in the same position.
 *
 * @param {quat2} a the first dual quat.
 * @param {quat2} b the second dual quat.
 * @returns {Boolean} true if the dual quats are equal, false otherwise.
 */


function equals(a, b) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3],
      a4 = a[4],
      a5 = a[5],
      a6 = a[6],
      a7 = a[7];
  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3],
      b4 = b[4],
      b5 = b[5],
      b6 = b[6],
      b7 = b[7];
  return Math.abs(a0 - b0) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a3), Math.abs(b3)) && Math.abs(a4 - b4) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a4), Math.abs(b4)) && Math.abs(a5 - b5) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a5), Math.abs(b5)) && Math.abs(a6 - b6) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a6), Math.abs(b6)) && Math.abs(a7 - b7) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a7), Math.abs(b7));
}
},{"./common.js":2,"./mat4.js":7,"./quat.js":8}],10:[function(require,module,exports){
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.create = create;
exports.clone = clone;
exports.fromValues = fromValues;
exports.copy = copy;
exports.set = set;
exports.add = add;
exports.subtract = subtract;
exports.multiply = multiply;
exports.divide = divide;
exports.ceil = ceil;
exports.floor = floor;
exports.min = min;
exports.max = max;
exports.round = round;
exports.scale = scale;
exports.scaleAndAdd = scaleAndAdd;
exports.distance = distance;
exports.squaredDistance = squaredDistance;
exports.length = length;
exports.squaredLength = squaredLength;
exports.negate = negate;
exports.inverse = inverse;
exports.normalize = normalize;
exports.dot = dot;
exports.cross = cross;
exports.lerp = lerp;
exports.random = random;
exports.transformMat2 = transformMat2;
exports.transformMat2d = transformMat2d;
exports.transformMat3 = transformMat3;
exports.transformMat4 = transformMat4;
exports.rotate = rotate;
exports.angle = angle;
exports.zero = zero;
exports.str = str;
exports.exactEquals = exactEquals;
exports.equals = equals;
exports.forEach = exports.sqrLen = exports.sqrDist = exports.dist = exports.div = exports.mul = exports.sub = exports.len = void 0;

var glMatrix = _interopRequireWildcard(require("./common.js"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function _getRequireWildcardCache() { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

/**
 * 2 Dimensional Vector
 * @module vec2
 */

/**
 * Creates a new, empty vec2
 *
 * @returns {vec2} a new 2D vector
 */
function create() {
  var out = new glMatrix.ARRAY_TYPE(2);

  if (glMatrix.ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
  }

  return out;
}
/**
 * Creates a new vec2 initialized with values from an existing vector
 *
 * @param {vec2} a vector to clone
 * @returns {vec2} a new 2D vector
 */


function clone(a) {
  var out = new glMatrix.ARRAY_TYPE(2);
  out[0] = a[0];
  out[1] = a[1];
  return out;
}
/**
 * Creates a new vec2 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @returns {vec2} a new 2D vector
 */


function fromValues(x, y) {
  var out = new glMatrix.ARRAY_TYPE(2);
  out[0] = x;
  out[1] = y;
  return out;
}
/**
 * Copy the values from one vec2 to another
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the source vector
 * @returns {vec2} out
 */


function copy(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  return out;
}
/**
 * Set the components of a vec2 to the given values
 *
 * @param {vec2} out the receiving vector
 * @param {Number} x X component
 * @param {Number} y Y component
 * @returns {vec2} out
 */


function set(out, x, y) {
  out[0] = x;
  out[1] = y;
  return out;
}
/**
 * Adds two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */


function add(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  return out;
}
/**
 * Subtracts vector b from vector a
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */


function subtract(out, a, b) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  return out;
}
/**
 * Multiplies two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */


function multiply(out, a, b) {
  out[0] = a[0] * b[0];
  out[1] = a[1] * b[1];
  return out;
}
/**
 * Divides two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */


function divide(out, a, b) {
  out[0] = a[0] / b[0];
  out[1] = a[1] / b[1];
  return out;
}
/**
 * Math.ceil the components of a vec2
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a vector to ceil
 * @returns {vec2} out
 */


function ceil(out, a) {
  out[0] = Math.ceil(a[0]);
  out[1] = Math.ceil(a[1]);
  return out;
}
/**
 * Math.floor the components of a vec2
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a vector to floor
 * @returns {vec2} out
 */


function floor(out, a) {
  out[0] = Math.floor(a[0]);
  out[1] = Math.floor(a[1]);
  return out;
}
/**
 * Returns the minimum of two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */


function min(out, a, b) {
  out[0] = Math.min(a[0], b[0]);
  out[1] = Math.min(a[1], b[1]);
  return out;
}
/**
 * Returns the maximum of two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */


function max(out, a, b) {
  out[0] = Math.max(a[0], b[0]);
  out[1] = Math.max(a[1], b[1]);
  return out;
}
/**
 * Math.round the components of a vec2
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a vector to round
 * @returns {vec2} out
 */


function round(out, a) {
  out[0] = Math.round(a[0]);
  out[1] = Math.round(a[1]);
  return out;
}
/**
 * Scales a vec2 by a scalar number
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec2} out
 */


function scale(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  return out;
}
/**
 * Adds two vec2's after scaling the second operand by a scalar value
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @param {Number} scale the amount to scale b by before adding
 * @returns {vec2} out
 */


function scaleAndAdd(out, a, b, scale) {
  out[0] = a[0] + b[0] * scale;
  out[1] = a[1] + b[1] * scale;
  return out;
}
/**
 * Calculates the euclidian distance between two vec2's
 *
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {Number} distance between a and b
 */


function distance(a, b) {
  var x = b[0] - a[0],
      y = b[1] - a[1];
  return Math.hypot(x, y);
}
/**
 * Calculates the squared euclidian distance between two vec2's
 *
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {Number} squared distance between a and b
 */


function squaredDistance(a, b) {
  var x = b[0] - a[0],
      y = b[1] - a[1];
  return x * x + y * y;
}
/**
 * Calculates the length of a vec2
 *
 * @param {vec2} a vector to calculate length of
 * @returns {Number} length of a
 */


function length(a) {
  var x = a[0],
      y = a[1];
  return Math.hypot(x, y);
}
/**
 * Calculates the squared length of a vec2
 *
 * @param {vec2} a vector to calculate squared length of
 * @returns {Number} squared length of a
 */


function squaredLength(a) {
  var x = a[0],
      y = a[1];
  return x * x + y * y;
}
/**
 * Negates the components of a vec2
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a vector to negate
 * @returns {vec2} out
 */


function negate(out, a) {
  out[0] = -a[0];
  out[1] = -a[1];
  return out;
}
/**
 * Returns the inverse of the components of a vec2
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a vector to invert
 * @returns {vec2} out
 */


function inverse(out, a) {
  out[0] = 1.0 / a[0];
  out[1] = 1.0 / a[1];
  return out;
}
/**
 * Normalize a vec2
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a vector to normalize
 * @returns {vec2} out
 */


function normalize(out, a) {
  var x = a[0],
      y = a[1];
  var len = x * x + y * y;

  if (len > 0) {
    //TODO: evaluate use of glm_invsqrt here?
    len = 1 / Math.sqrt(len);
  }

  out[0] = a[0] * len;
  out[1] = a[1] * len;
  return out;
}
/**
 * Calculates the dot product of two vec2's
 *
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {Number} dot product of a and b
 */


function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1];
}
/**
 * Computes the cross product of two vec2's
 * Note that the cross product must by definition produce a 3D vector
 *
 * @param {vec3} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec3} out
 */


function cross(out, a, b) {
  var z = a[0] * b[1] - a[1] * b[0];
  out[0] = out[1] = 0;
  out[2] = z;
  return out;
}
/**
 * Performs a linear interpolation between two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {vec2} out
 */


function lerp(out, a, b, t) {
  var ax = a[0],
      ay = a[1];
  out[0] = ax + t * (b[0] - ax);
  out[1] = ay + t * (b[1] - ay);
  return out;
}
/**
 * Generates a random vector with the given scale
 *
 * @param {vec2} out the receiving vector
 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
 * @returns {vec2} out
 */


function random(out, scale) {
  scale = scale || 1.0;
  var r = glMatrix.RANDOM() * 2.0 * Math.PI;
  out[0] = Math.cos(r) * scale;
  out[1] = Math.sin(r) * scale;
  return out;
}
/**
 * Transforms the vec2 with a mat2
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the vector to transform
 * @param {mat2} m matrix to transform with
 * @returns {vec2} out
 */


function transformMat2(out, a, m) {
  var x = a[0],
      y = a[1];
  out[0] = m[0] * x + m[2] * y;
  out[1] = m[1] * x + m[3] * y;
  return out;
}
/**
 * Transforms the vec2 with a mat2d
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the vector to transform
 * @param {mat2d} m matrix to transform with
 * @returns {vec2} out
 */


function transformMat2d(out, a, m) {
  var x = a[0],
      y = a[1];
  out[0] = m[0] * x + m[2] * y + m[4];
  out[1] = m[1] * x + m[3] * y + m[5];
  return out;
}
/**
 * Transforms the vec2 with a mat3
 * 3rd vector component is implicitly '1'
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the vector to transform
 * @param {mat3} m matrix to transform with
 * @returns {vec2} out
 */


function transformMat3(out, a, m) {
  var x = a[0],
      y = a[1];
  out[0] = m[0] * x + m[3] * y + m[6];
  out[1] = m[1] * x + m[4] * y + m[7];
  return out;
}
/**
 * Transforms the vec2 with a mat4
 * 3rd vector component is implicitly '0'
 * 4th vector component is implicitly '1'
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the vector to transform
 * @param {mat4} m matrix to transform with
 * @returns {vec2} out
 */


function transformMat4(out, a, m) {
  var x = a[0];
  var y = a[1];
  out[0] = m[0] * x + m[4] * y + m[12];
  out[1] = m[1] * x + m[5] * y + m[13];
  return out;
}
/**
 * Rotate a 2D vector
 * @param {vec2} out The receiving vec2
 * @param {vec2} a The vec2 point to rotate
 * @param {vec2} b The origin of the rotation
 * @param {Number} rad The angle of rotation in radians
 * @returns {vec2} out
 */


function rotate(out, a, b, rad) {
  //Translate point to the origin
  var p0 = a[0] - b[0],
      p1 = a[1] - b[1],
      sinC = Math.sin(rad),
      cosC = Math.cos(rad); //perform rotation and translate to correct position

  out[0] = p0 * cosC - p1 * sinC + b[0];
  out[1] = p0 * sinC + p1 * cosC + b[1];
  return out;
}
/**
 * Get the angle between two 2D vectors
 * @param {vec2} a The first operand
 * @param {vec2} b The second operand
 * @returns {Number} The angle in radians
 */


function angle(a, b) {
  var x1 = a[0],
      y1 = a[1],
      x2 = b[0],
      y2 = b[1],
      // mag is the product of the magnitudes of a and b
  mag = Math.sqrt(x1 * x1 + y1 * y1) * Math.sqrt(x2 * x2 + y2 * y2),
      // mag &&.. short circuits if mag == 0
  cosine = mag && (x1 * x2 + y1 * y2) / mag; // Math.min(Math.max(cosine, -1), 1) clamps the cosine between -1 and 1

  return Math.acos(Math.min(Math.max(cosine, -1), 1));
}
/**
 * Set the components of a vec2 to zero
 *
 * @param {vec2} out the receiving vector
 * @returns {vec2} out
 */


function zero(out) {
  out[0] = 0.0;
  out[1] = 0.0;
  return out;
}
/**
 * Returns a string representation of a vector
 *
 * @param {vec2} a vector to represent as a string
 * @returns {String} string representation of the vector
 */


function str(a) {
  return "vec2(" + a[0] + ", " + a[1] + ")";
}
/**
 * Returns whether or not the vectors exactly have the same elements in the same position (when compared with ===)
 *
 * @param {vec2} a The first vector.
 * @param {vec2} b The second vector.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */


function exactEquals(a, b) {
  return a[0] === b[0] && a[1] === b[1];
}
/**
 * Returns whether or not the vectors have approximately the same elements in the same position.
 *
 * @param {vec2} a The first vector.
 * @param {vec2} b The second vector.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */


function equals(a, b) {
  var a0 = a[0],
      a1 = a[1];
  var b0 = b[0],
      b1 = b[1];
  return Math.abs(a0 - b0) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1));
}
/**
 * Alias for {@link vec2.length}
 * @function
 */


var len = length;
/**
 * Alias for {@link vec2.subtract}
 * @function
 */

exports.len = len;
var sub = subtract;
/**
 * Alias for {@link vec2.multiply}
 * @function
 */

exports.sub = sub;
var mul = multiply;
/**
 * Alias for {@link vec2.divide}
 * @function
 */

exports.mul = mul;
var div = divide;
/**
 * Alias for {@link vec2.distance}
 * @function
 */

exports.div = div;
var dist = distance;
/**
 * Alias for {@link vec2.squaredDistance}
 * @function
 */

exports.dist = dist;
var sqrDist = squaredDistance;
/**
 * Alias for {@link vec2.squaredLength}
 * @function
 */

exports.sqrDist = sqrDist;
var sqrLen = squaredLength;
/**
 * Perform some operation over an array of vec2s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec2. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec2s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

exports.sqrLen = sqrLen;

var forEach = function () {
  var vec = create();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;

    if (!stride) {
      stride = 2;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
    }

    return a;
  };
}();

exports.forEach = forEach;
},{"./common.js":2}],11:[function(require,module,exports){
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.create = create;
exports.clone = clone;
exports.length = length;
exports.fromValues = fromValues;
exports.copy = copy;
exports.set = set;
exports.add = add;
exports.subtract = subtract;
exports.multiply = multiply;
exports.divide = divide;
exports.ceil = ceil;
exports.floor = floor;
exports.min = min;
exports.max = max;
exports.round = round;
exports.scale = scale;
exports.scaleAndAdd = scaleAndAdd;
exports.distance = distance;
exports.squaredDistance = squaredDistance;
exports.squaredLength = squaredLength;
exports.negate = negate;
exports.inverse = inverse;
exports.normalize = normalize;
exports.dot = dot;
exports.cross = cross;
exports.lerp = lerp;
exports.hermite = hermite;
exports.bezier = bezier;
exports.random = random;
exports.transformMat4 = transformMat4;
exports.transformMat3 = transformMat3;
exports.transformQuat = transformQuat;
exports.rotateX = rotateX;
exports.rotateY = rotateY;
exports.rotateZ = rotateZ;
exports.angle = angle;
exports.zero = zero;
exports.str = str;
exports.exactEquals = exactEquals;
exports.equals = equals;
exports.forEach = exports.sqrLen = exports.len = exports.sqrDist = exports.dist = exports.div = exports.mul = exports.sub = void 0;

var glMatrix = _interopRequireWildcard(require("./common.js"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function _getRequireWildcardCache() { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

/**
 * 3 Dimensional Vector
 * @module vec3
 */

/**
 * Creates a new, empty vec3
 *
 * @returns {vec3} a new 3D vector
 */
function create() {
  var out = new glMatrix.ARRAY_TYPE(3);

  if (glMatrix.ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
  }

  return out;
}
/**
 * Creates a new vec3 initialized with values from an existing vector
 *
 * @param {vec3} a vector to clone
 * @returns {vec3} a new 3D vector
 */


function clone(a) {
  var out = new glMatrix.ARRAY_TYPE(3);
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  return out;
}
/**
 * Calculates the length of a vec3
 *
 * @param {vec3} a vector to calculate length of
 * @returns {Number} length of a
 */


function length(a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  return Math.hypot(x, y, z);
}
/**
 * Creates a new vec3 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @returns {vec3} a new 3D vector
 */


function fromValues(x, y, z) {
  var out = new glMatrix.ARRAY_TYPE(3);
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}
/**
 * Copy the values from one vec3 to another
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the source vector
 * @returns {vec3} out
 */


function copy(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  return out;
}
/**
 * Set the components of a vec3 to the given values
 *
 * @param {vec3} out the receiving vector
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @returns {vec3} out
 */


function set(out, x, y, z) {
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}
/**
 * Adds two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */


function add(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  return out;
}
/**
 * Subtracts vector b from vector a
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */


function subtract(out, a, b) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  return out;
}
/**
 * Multiplies two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */


function multiply(out, a, b) {
  out[0] = a[0] * b[0];
  out[1] = a[1] * b[1];
  out[2] = a[2] * b[2];
  return out;
}
/**
 * Divides two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */


function divide(out, a, b) {
  out[0] = a[0] / b[0];
  out[1] = a[1] / b[1];
  out[2] = a[2] / b[2];
  return out;
}
/**
 * Math.ceil the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a vector to ceil
 * @returns {vec3} out
 */


function ceil(out, a) {
  out[0] = Math.ceil(a[0]);
  out[1] = Math.ceil(a[1]);
  out[2] = Math.ceil(a[2]);
  return out;
}
/**
 * Math.floor the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a vector to floor
 * @returns {vec3} out
 */


function floor(out, a) {
  out[0] = Math.floor(a[0]);
  out[1] = Math.floor(a[1]);
  out[2] = Math.floor(a[2]);
  return out;
}
/**
 * Returns the minimum of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */


function min(out, a, b) {
  out[0] = Math.min(a[0], b[0]);
  out[1] = Math.min(a[1], b[1]);
  out[2] = Math.min(a[2], b[2]);
  return out;
}
/**
 * Returns the maximum of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */


function max(out, a, b) {
  out[0] = Math.max(a[0], b[0]);
  out[1] = Math.max(a[1], b[1]);
  out[2] = Math.max(a[2], b[2]);
  return out;
}
/**
 * Math.round the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a vector to round
 * @returns {vec3} out
 */


function round(out, a) {
  out[0] = Math.round(a[0]);
  out[1] = Math.round(a[1]);
  out[2] = Math.round(a[2]);
  return out;
}
/**
 * Scales a vec3 by a scalar number
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec3} out
 */


function scale(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  out[2] = a[2] * b;
  return out;
}
/**
 * Adds two vec3's after scaling the second operand by a scalar value
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @param {Number} scale the amount to scale b by before adding
 * @returns {vec3} out
 */


function scaleAndAdd(out, a, b, scale) {
  out[0] = a[0] + b[0] * scale;
  out[1] = a[1] + b[1] * scale;
  out[2] = a[2] + b[2] * scale;
  return out;
}
/**
 * Calculates the euclidian distance between two vec3's
 *
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {Number} distance between a and b
 */


function distance(a, b) {
  var x = b[0] - a[0];
  var y = b[1] - a[1];
  var z = b[2] - a[2];
  return Math.hypot(x, y, z);
}
/**
 * Calculates the squared euclidian distance between two vec3's
 *
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {Number} squared distance between a and b
 */


function squaredDistance(a, b) {
  var x = b[0] - a[0];
  var y = b[1] - a[1];
  var z = b[2] - a[2];
  return x * x + y * y + z * z;
}
/**
 * Calculates the squared length of a vec3
 *
 * @param {vec3} a vector to calculate squared length of
 * @returns {Number} squared length of a
 */


function squaredLength(a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  return x * x + y * y + z * z;
}
/**
 * Negates the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a vector to negate
 * @returns {vec3} out
 */


function negate(out, a) {
  out[0] = -a[0];
  out[1] = -a[1];
  out[2] = -a[2];
  return out;
}
/**
 * Returns the inverse of the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a vector to invert
 * @returns {vec3} out
 */


function inverse(out, a) {
  out[0] = 1.0 / a[0];
  out[1] = 1.0 / a[1];
  out[2] = 1.0 / a[2];
  return out;
}
/**
 * Normalize a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a vector to normalize
 * @returns {vec3} out
 */


function normalize(out, a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  var len = x * x + y * y + z * z;

  if (len > 0) {
    //TODO: evaluate use of glm_invsqrt here?
    len = 1 / Math.sqrt(len);
  }

  out[0] = a[0] * len;
  out[1] = a[1] * len;
  out[2] = a[2] * len;
  return out;
}
/**
 * Calculates the dot product of two vec3's
 *
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {Number} dot product of a and b
 */


function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
/**
 * Computes the cross product of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */


function cross(out, a, b) {
  var ax = a[0],
      ay = a[1],
      az = a[2];
  var bx = b[0],
      by = b[1],
      bz = b[2];
  out[0] = ay * bz - az * by;
  out[1] = az * bx - ax * bz;
  out[2] = ax * by - ay * bx;
  return out;
}
/**
 * Performs a linear interpolation between two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {vec3} out
 */


function lerp(out, a, b, t) {
  var ax = a[0];
  var ay = a[1];
  var az = a[2];
  out[0] = ax + t * (b[0] - ax);
  out[1] = ay + t * (b[1] - ay);
  out[2] = az + t * (b[2] - az);
  return out;
}
/**
 * Performs a hermite interpolation with two control points
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @param {vec3} c the third operand
 * @param {vec3} d the fourth operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {vec3} out
 */


function hermite(out, a, b, c, d, t) {
  var factorTimes2 = t * t;
  var factor1 = factorTimes2 * (2 * t - 3) + 1;
  var factor2 = factorTimes2 * (t - 2) + t;
  var factor3 = factorTimes2 * (t - 1);
  var factor4 = factorTimes2 * (3 - 2 * t);
  out[0] = a[0] * factor1 + b[0] * factor2 + c[0] * factor3 + d[0] * factor4;
  out[1] = a[1] * factor1 + b[1] * factor2 + c[1] * factor3 + d[1] * factor4;
  out[2] = a[2] * factor1 + b[2] * factor2 + c[2] * factor3 + d[2] * factor4;
  return out;
}
/**
 * Performs a bezier interpolation with two control points
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @param {vec3} c the third operand
 * @param {vec3} d the fourth operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {vec3} out
 */


function bezier(out, a, b, c, d, t) {
  var inverseFactor = 1 - t;
  var inverseFactorTimesTwo = inverseFactor * inverseFactor;
  var factorTimes2 = t * t;
  var factor1 = inverseFactorTimesTwo * inverseFactor;
  var factor2 = 3 * t * inverseFactorTimesTwo;
  var factor3 = 3 * factorTimes2 * inverseFactor;
  var factor4 = factorTimes2 * t;
  out[0] = a[0] * factor1 + b[0] * factor2 + c[0] * factor3 + d[0] * factor4;
  out[1] = a[1] * factor1 + b[1] * factor2 + c[1] * factor3 + d[1] * factor4;
  out[2] = a[2] * factor1 + b[2] * factor2 + c[2] * factor3 + d[2] * factor4;
  return out;
}
/**
 * Generates a random vector with the given scale
 *
 * @param {vec3} out the receiving vector
 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
 * @returns {vec3} out
 */


function random(out, scale) {
  scale = scale || 1.0;
  var r = glMatrix.RANDOM() * 2.0 * Math.PI;
  var z = glMatrix.RANDOM() * 2.0 - 1.0;
  var zScale = Math.sqrt(1.0 - z * z) * scale;
  out[0] = Math.cos(r) * zScale;
  out[1] = Math.sin(r) * zScale;
  out[2] = z * scale;
  return out;
}
/**
 * Transforms the vec3 with a mat4.
 * 4th vector component is implicitly '1'
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the vector to transform
 * @param {mat4} m matrix to transform with
 * @returns {vec3} out
 */


function transformMat4(out, a, m) {
  var x = a[0],
      y = a[1],
      z = a[2];
  var w = m[3] * x + m[7] * y + m[11] * z + m[15];
  w = w || 1.0;
  out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
  out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
  out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
  return out;
}
/**
 * Transforms the vec3 with a mat3.
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the vector to transform
 * @param {mat3} m the 3x3 matrix to transform with
 * @returns {vec3} out
 */


function transformMat3(out, a, m) {
  var x = a[0],
      y = a[1],
      z = a[2];
  out[0] = x * m[0] + y * m[3] + z * m[6];
  out[1] = x * m[1] + y * m[4] + z * m[7];
  out[2] = x * m[2] + y * m[5] + z * m[8];
  return out;
}
/**
 * Transforms the vec3 with a quat
 * Can also be used for dual quaternions. (Multiply it with the real part)
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the vector to transform
 * @param {quat} q quaternion to transform with
 * @returns {vec3} out
 */


function transformQuat(out, a, q) {
  // benchmarks: https://jsperf.com/quaternion-transform-vec3-implementations-fixed
  var qx = q[0],
      qy = q[1],
      qz = q[2],
      qw = q[3];
  var x = a[0],
      y = a[1],
      z = a[2]; // var qvec = [qx, qy, qz];
  // var uv = vec3.cross([], qvec, a);

  var uvx = qy * z - qz * y,
      uvy = qz * x - qx * z,
      uvz = qx * y - qy * x; // var uuv = vec3.cross([], qvec, uv);

  var uuvx = qy * uvz - qz * uvy,
      uuvy = qz * uvx - qx * uvz,
      uuvz = qx * uvy - qy * uvx; // vec3.scale(uv, uv, 2 * w);

  var w2 = qw * 2;
  uvx *= w2;
  uvy *= w2;
  uvz *= w2; // vec3.scale(uuv, uuv, 2);

  uuvx *= 2;
  uuvy *= 2;
  uuvz *= 2; // return vec3.add(out, a, vec3.add(out, uv, uuv));

  out[0] = x + uvx + uuvx;
  out[1] = y + uvy + uuvy;
  out[2] = z + uvz + uuvz;
  return out;
}
/**
 * Rotate a 3D vector around the x-axis
 * @param {vec3} out The receiving vec3
 * @param {vec3} a The vec3 point to rotate
 * @param {vec3} b The origin of the rotation
 * @param {Number} rad The angle of rotation in radians
 * @returns {vec3} out
 */


function rotateX(out, a, b, rad) {
  var p = [],
      r = []; //Translate point to the origin

  p[0] = a[0] - b[0];
  p[1] = a[1] - b[1];
  p[2] = a[2] - b[2]; //perform rotation

  r[0] = p[0];
  r[1] = p[1] * Math.cos(rad) - p[2] * Math.sin(rad);
  r[2] = p[1] * Math.sin(rad) + p[2] * Math.cos(rad); //translate to correct position

  out[0] = r[0] + b[0];
  out[1] = r[1] + b[1];
  out[2] = r[2] + b[2];
  return out;
}
/**
 * Rotate a 3D vector around the y-axis
 * @param {vec3} out The receiving vec3
 * @param {vec3} a The vec3 point to rotate
 * @param {vec3} b The origin of the rotation
 * @param {Number} rad The angle of rotation in radians
 * @returns {vec3} out
 */


function rotateY(out, a, b, rad) {
  var p = [],
      r = []; //Translate point to the origin

  p[0] = a[0] - b[0];
  p[1] = a[1] - b[1];
  p[2] = a[2] - b[2]; //perform rotation

  r[0] = p[2] * Math.sin(rad) + p[0] * Math.cos(rad);
  r[1] = p[1];
  r[2] = p[2] * Math.cos(rad) - p[0] * Math.sin(rad); //translate to correct position

  out[0] = r[0] + b[0];
  out[1] = r[1] + b[1];
  out[2] = r[2] + b[2];
  return out;
}
/**
 * Rotate a 3D vector around the z-axis
 * @param {vec3} out The receiving vec3
 * @param {vec3} a The vec3 point to rotate
 * @param {vec3} b The origin of the rotation
 * @param {Number} rad The angle of rotation in radians
 * @returns {vec3} out
 */


function rotateZ(out, a, b, rad) {
  var p = [],
      r = []; //Translate point to the origin

  p[0] = a[0] - b[0];
  p[1] = a[1] - b[1];
  p[2] = a[2] - b[2]; //perform rotation

  r[0] = p[0] * Math.cos(rad) - p[1] * Math.sin(rad);
  r[1] = p[0] * Math.sin(rad) + p[1] * Math.cos(rad);
  r[2] = p[2]; //translate to correct position

  out[0] = r[0] + b[0];
  out[1] = r[1] + b[1];
  out[2] = r[2] + b[2];
  return out;
}
/**
 * Get the angle between two 3D vectors
 * @param {vec3} a The first operand
 * @param {vec3} b The second operand
 * @returns {Number} The angle in radians
 */


function angle(a, b) {
  var ax = a[0],
      ay = a[1],
      az = a[2],
      bx = b[0],
      by = b[1],
      bz = b[2],
      mag1 = Math.sqrt(ax * ax + ay * ay + az * az),
      mag2 = Math.sqrt(bx * bx + by * by + bz * bz),
      mag = mag1 * mag2,
      cosine = mag && dot(a, b) / mag;
  return Math.acos(Math.min(Math.max(cosine, -1), 1));
}
/**
 * Set the components of a vec3 to zero
 *
 * @param {vec3} out the receiving vector
 * @returns {vec3} out
 */


function zero(out) {
  out[0] = 0.0;
  out[1] = 0.0;
  out[2] = 0.0;
  return out;
}
/**
 * Returns a string representation of a vector
 *
 * @param {vec3} a vector to represent as a string
 * @returns {String} string representation of the vector
 */


function str(a) {
  return "vec3(" + a[0] + ", " + a[1] + ", " + a[2] + ")";
}
/**
 * Returns whether or not the vectors have exactly the same elements in the same position (when compared with ===)
 *
 * @param {vec3} a The first vector.
 * @param {vec3} b The second vector.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */


function exactEquals(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}
/**
 * Returns whether or not the vectors have approximately the same elements in the same position.
 *
 * @param {vec3} a The first vector.
 * @param {vec3} b The second vector.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */


function equals(a, b) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2];
  var b0 = b[0],
      b1 = b[1],
      b2 = b[2];
  return Math.abs(a0 - b0) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a2), Math.abs(b2));
}
/**
 * Alias for {@link vec3.subtract}
 * @function
 */


var sub = subtract;
/**
 * Alias for {@link vec3.multiply}
 * @function
 */

exports.sub = sub;
var mul = multiply;
/**
 * Alias for {@link vec3.divide}
 * @function
 */

exports.mul = mul;
var div = divide;
/**
 * Alias for {@link vec3.distance}
 * @function
 */

exports.div = div;
var dist = distance;
/**
 * Alias for {@link vec3.squaredDistance}
 * @function
 */

exports.dist = dist;
var sqrDist = squaredDistance;
/**
 * Alias for {@link vec3.length}
 * @function
 */

exports.sqrDist = sqrDist;
var len = length;
/**
 * Alias for {@link vec3.squaredLength}
 * @function
 */

exports.len = len;
var sqrLen = squaredLength;
/**
 * Perform some operation over an array of vec3s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec3. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec3s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

exports.sqrLen = sqrLen;

var forEach = function () {
  var vec = create();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;

    if (!stride) {
      stride = 3;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      vec[2] = a[i + 2];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
      a[i + 2] = vec[2];
    }

    return a;
  };
}();

exports.forEach = forEach;
},{"./common.js":2}],12:[function(require,module,exports){
"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.create = create;
exports.clone = clone;
exports.fromValues = fromValues;
exports.copy = copy;
exports.set = set;
exports.add = add;
exports.subtract = subtract;
exports.multiply = multiply;
exports.divide = divide;
exports.ceil = ceil;
exports.floor = floor;
exports.min = min;
exports.max = max;
exports.round = round;
exports.scale = scale;
exports.scaleAndAdd = scaleAndAdd;
exports.distance = distance;
exports.squaredDistance = squaredDistance;
exports.length = length;
exports.squaredLength = squaredLength;
exports.negate = negate;
exports.inverse = inverse;
exports.normalize = normalize;
exports.dot = dot;
exports.cross = cross;
exports.lerp = lerp;
exports.random = random;
exports.transformMat4 = transformMat4;
exports.transformQuat = transformQuat;
exports.zero = zero;
exports.str = str;
exports.exactEquals = exactEquals;
exports.equals = equals;
exports.forEach = exports.sqrLen = exports.len = exports.sqrDist = exports.dist = exports.div = exports.mul = exports.sub = void 0;

var glMatrix = _interopRequireWildcard(require("./common.js"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function _getRequireWildcardCache() { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

/**
 * 4 Dimensional Vector
 * @module vec4
 */

/**
 * Creates a new, empty vec4
 *
 * @returns {vec4} a new 4D vector
 */
function create() {
  var out = new glMatrix.ARRAY_TYPE(4);

  if (glMatrix.ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
  }

  return out;
}
/**
 * Creates a new vec4 initialized with values from an existing vector
 *
 * @param {vec4} a vector to clone
 * @returns {vec4} a new 4D vector
 */


function clone(a) {
  var out = new glMatrix.ARRAY_TYPE(4);
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  return out;
}
/**
 * Creates a new vec4 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {vec4} a new 4D vector
 */


function fromValues(x, y, z, w) {
  var out = new glMatrix.ARRAY_TYPE(4);
  out[0] = x;
  out[1] = y;
  out[2] = z;
  out[3] = w;
  return out;
}
/**
 * Copy the values from one vec4 to another
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the source vector
 * @returns {vec4} out
 */


function copy(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  return out;
}
/**
 * Set the components of a vec4 to the given values
 *
 * @param {vec4} out the receiving vector
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {vec4} out
 */


function set(out, x, y, z, w) {
  out[0] = x;
  out[1] = y;
  out[2] = z;
  out[3] = w;
  return out;
}
/**
 * Adds two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {vec4} out
 */


function add(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  out[3] = a[3] + b[3];
  return out;
}
/**
 * Subtracts vector b from vector a
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {vec4} out
 */


function subtract(out, a, b) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  out[3] = a[3] - b[3];
  return out;
}
/**
 * Multiplies two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {vec4} out
 */


function multiply(out, a, b) {
  out[0] = a[0] * b[0];
  out[1] = a[1] * b[1];
  out[2] = a[2] * b[2];
  out[3] = a[3] * b[3];
  return out;
}
/**
 * Divides two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {vec4} out
 */


function divide(out, a, b) {
  out[0] = a[0] / b[0];
  out[1] = a[1] / b[1];
  out[2] = a[2] / b[2];
  out[3] = a[3] / b[3];
  return out;
}
/**
 * Math.ceil the components of a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a vector to ceil
 * @returns {vec4} out
 */


function ceil(out, a) {
  out[0] = Math.ceil(a[0]);
  out[1] = Math.ceil(a[1]);
  out[2] = Math.ceil(a[2]);
  out[3] = Math.ceil(a[3]);
  return out;
}
/**
 * Math.floor the components of a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a vector to floor
 * @returns {vec4} out
 */


function floor(out, a) {
  out[0] = Math.floor(a[0]);
  out[1] = Math.floor(a[1]);
  out[2] = Math.floor(a[2]);
  out[3] = Math.floor(a[3]);
  return out;
}
/**
 * Returns the minimum of two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {vec4} out
 */


function min(out, a, b) {
  out[0] = Math.min(a[0], b[0]);
  out[1] = Math.min(a[1], b[1]);
  out[2] = Math.min(a[2], b[2]);
  out[3] = Math.min(a[3], b[3]);
  return out;
}
/**
 * Returns the maximum of two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {vec4} out
 */


function max(out, a, b) {
  out[0] = Math.max(a[0], b[0]);
  out[1] = Math.max(a[1], b[1]);
  out[2] = Math.max(a[2], b[2]);
  out[3] = Math.max(a[3], b[3]);
  return out;
}
/**
 * Math.round the components of a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a vector to round
 * @returns {vec4} out
 */


function round(out, a) {
  out[0] = Math.round(a[0]);
  out[1] = Math.round(a[1]);
  out[2] = Math.round(a[2]);
  out[3] = Math.round(a[3]);
  return out;
}
/**
 * Scales a vec4 by a scalar number
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec4} out
 */


function scale(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  out[2] = a[2] * b;
  out[3] = a[3] * b;
  return out;
}
/**
 * Adds two vec4's after scaling the second operand by a scalar value
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @param {Number} scale the amount to scale b by before adding
 * @returns {vec4} out
 */


function scaleAndAdd(out, a, b, scale) {
  out[0] = a[0] + b[0] * scale;
  out[1] = a[1] + b[1] * scale;
  out[2] = a[2] + b[2] * scale;
  out[3] = a[3] + b[3] * scale;
  return out;
}
/**
 * Calculates the euclidian distance between two vec4's
 *
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {Number} distance between a and b
 */


function distance(a, b) {
  var x = b[0] - a[0];
  var y = b[1] - a[1];
  var z = b[2] - a[2];
  var w = b[3] - a[3];
  return Math.hypot(x, y, z, w);
}
/**
 * Calculates the squared euclidian distance between two vec4's
 *
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {Number} squared distance between a and b
 */


function squaredDistance(a, b) {
  var x = b[0] - a[0];
  var y = b[1] - a[1];
  var z = b[2] - a[2];
  var w = b[3] - a[3];
  return x * x + y * y + z * z + w * w;
}
/**
 * Calculates the length of a vec4
 *
 * @param {vec4} a vector to calculate length of
 * @returns {Number} length of a
 */


function length(a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  var w = a[3];
  return Math.hypot(x, y, z, w);
}
/**
 * Calculates the squared length of a vec4
 *
 * @param {vec4} a vector to calculate squared length of
 * @returns {Number} squared length of a
 */


function squaredLength(a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  var w = a[3];
  return x * x + y * y + z * z + w * w;
}
/**
 * Negates the components of a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a vector to negate
 * @returns {vec4} out
 */


function negate(out, a) {
  out[0] = -a[0];
  out[1] = -a[1];
  out[2] = -a[2];
  out[3] = -a[3];
  return out;
}
/**
 * Returns the inverse of the components of a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a vector to invert
 * @returns {vec4} out
 */


function inverse(out, a) {
  out[0] = 1.0 / a[0];
  out[1] = 1.0 / a[1];
  out[2] = 1.0 / a[2];
  out[3] = 1.0 / a[3];
  return out;
}
/**
 * Normalize a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a vector to normalize
 * @returns {vec4} out
 */


function normalize(out, a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  var w = a[3];
  var len = x * x + y * y + z * z + w * w;

  if (len > 0) {
    len = 1 / Math.sqrt(len);
  }

  out[0] = x * len;
  out[1] = y * len;
  out[2] = z * len;
  out[3] = w * len;
  return out;
}
/**
 * Calculates the dot product of two vec4's
 *
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {Number} dot product of a and b
 */


function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
}
/**
 * Returns the cross-product of three vectors in a 4-dimensional space
 *
 * @param {vec4} result the receiving vector
 * @param {vec4} U the first vector
 * @param {vec4} V the second vector
 * @param {vec4} W the third vector
 * @returns {vec4} result
 */


function cross(out, u, v, w) {
  var A = v[0] * w[1] - v[1] * w[0],
      B = v[0] * w[2] - v[2] * w[0],
      C = v[0] * w[3] - v[3] * w[0],
      D = v[1] * w[2] - v[2] * w[1],
      E = v[1] * w[3] - v[3] * w[1],
      F = v[2] * w[3] - v[3] * w[2];
  var G = u[0];
  var H = u[1];
  var I = u[2];
  var J = u[3];
  out[0] = H * F - I * E + J * D;
  out[1] = -(G * F) + I * C - J * B;
  out[2] = G * E - H * C + J * A;
  out[3] = -(G * D) + H * B - I * A;
  return out;
}
/**
 * Performs a linear interpolation between two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {vec4} out
 */


function lerp(out, a, b, t) {
  var ax = a[0];
  var ay = a[1];
  var az = a[2];
  var aw = a[3];
  out[0] = ax + t * (b[0] - ax);
  out[1] = ay + t * (b[1] - ay);
  out[2] = az + t * (b[2] - az);
  out[3] = aw + t * (b[3] - aw);
  return out;
}
/**
 * Generates a random vector with the given scale
 *
 * @param {vec4} out the receiving vector
 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
 * @returns {vec4} out
 */


function random(out, scale) {
  scale = scale || 1.0; // Marsaglia, George. Choosing a Point from the Surface of a
  // Sphere. Ann. Math. Statist. 43 (1972), no. 2, 645--646.
  // http://projecteuclid.org/euclid.aoms/1177692644;

  var v1, v2, v3, v4;
  var s1, s2;

  do {
    v1 = glMatrix.RANDOM() * 2 - 1;
    v2 = glMatrix.RANDOM() * 2 - 1;
    s1 = v1 * v1 + v2 * v2;
  } while (s1 >= 1);

  do {
    v3 = glMatrix.RANDOM() * 2 - 1;
    v4 = glMatrix.RANDOM() * 2 - 1;
    s2 = v3 * v3 + v4 * v4;
  } while (s2 >= 1);

  var d = Math.sqrt((1 - s1) / s2);
  out[0] = scale * v1;
  out[1] = scale * v2;
  out[2] = scale * v3 * d;
  out[3] = scale * v4 * d;
  return out;
}
/**
 * Transforms the vec4 with a mat4.
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the vector to transform
 * @param {mat4} m matrix to transform with
 * @returns {vec4} out
 */


function transformMat4(out, a, m) {
  var x = a[0],
      y = a[1],
      z = a[2],
      w = a[3];
  out[0] = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
  out[1] = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
  out[2] = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
  out[3] = m[3] * x + m[7] * y + m[11] * z + m[15] * w;
  return out;
}
/**
 * Transforms the vec4 with a quat
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the vector to transform
 * @param {quat} q quaternion to transform with
 * @returns {vec4} out
 */


function transformQuat(out, a, q) {
  var x = a[0],
      y = a[1],
      z = a[2];
  var qx = q[0],
      qy = q[1],
      qz = q[2],
      qw = q[3]; // calculate quat * vec

  var ix = qw * x + qy * z - qz * y;
  var iy = qw * y + qz * x - qx * z;
  var iz = qw * z + qx * y - qy * x;
  var iw = -qx * x - qy * y - qz * z; // calculate result * inverse quat

  out[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
  out[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
  out[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;
  out[3] = a[3];
  return out;
}
/**
 * Set the components of a vec4 to zero
 *
 * @param {vec4} out the receiving vector
 * @returns {vec4} out
 */


function zero(out) {
  out[0] = 0.0;
  out[1] = 0.0;
  out[2] = 0.0;
  out[3] = 0.0;
  return out;
}
/**
 * Returns a string representation of a vector
 *
 * @param {vec4} a vector to represent as a string
 * @returns {String} string representation of the vector
 */


function str(a) {
  return "vec4(" + a[0] + ", " + a[1] + ", " + a[2] + ", " + a[3] + ")";
}
/**
 * Returns whether or not the vectors have exactly the same elements in the same position (when compared with ===)
 *
 * @param {vec4} a The first vector.
 * @param {vec4} b The second vector.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */


function exactEquals(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}
/**
 * Returns whether or not the vectors have approximately the same elements in the same position.
 *
 * @param {vec4} a The first vector.
 * @param {vec4} b The second vector.
 * @returns {Boolean} True if the vectors are equal, false otherwise.
 */


function equals(a, b) {
  var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3];
  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3];
  return Math.abs(a0 - b0) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a3), Math.abs(b3));
}
/**
 * Alias for {@link vec4.subtract}
 * @function
 */


var sub = subtract;
/**
 * Alias for {@link vec4.multiply}
 * @function
 */

exports.sub = sub;
var mul = multiply;
/**
 * Alias for {@link vec4.divide}
 * @function
 */

exports.mul = mul;
var div = divide;
/**
 * Alias for {@link vec4.distance}
 * @function
 */

exports.div = div;
var dist = distance;
/**
 * Alias for {@link vec4.squaredDistance}
 * @function
 */

exports.dist = dist;
var sqrDist = squaredDistance;
/**
 * Alias for {@link vec4.length}
 * @function
 */

exports.sqrDist = sqrDist;
var len = length;
/**
 * Alias for {@link vec4.squaredLength}
 * @function
 */

exports.len = len;
var sqrLen = squaredLength;
/**
 * Perform some operation over an array of vec4s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec4. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec4s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

exports.sqrLen = sqrLen;

var forEach = function () {
  var vec = create();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;

    if (!stride) {
      stride = 4;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      vec[2] = a[i + 2];
      vec[3] = a[i + 3];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
      a[i + 2] = vec[2];
      a[i + 3] = vec[3];
    }

    return a;
  };
}();

exports.forEach = forEach;
},{"./common.js":2}],13:[function(require,module,exports){
!function(e,t){"object"==typeof exports&&"object"==typeof module?module.exports=t():"function"==typeof define&&define.amd?define("OBJ",[],t):"object"==typeof exports?exports.OBJ=t():e.OBJ=t()}("undefined"!=typeof self?self:this,(function(){return function(e){var t={};function n(a){if(t[a])return t[a].exports;var s=t[a]={i:a,l:!1,exports:{}};return e[a].call(s.exports,s,s.exports,n),s.l=!0,s.exports}return n.m=e,n.c=t,n.d=function(e,t,a){n.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:a})},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},n.t=function(e,t){if(1&t&&(e=n(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var a=Object.create(null);if(n.r(a),Object.defineProperty(a,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var s in e)n.d(a,s,function(t){return e[t]}.bind(null,s));return a},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="/",n(n.s=0)}({"./src/index.ts":
/*!**********************!*\
  !*** ./src/index.ts ***!
  \**********************/
/*! exports provided: Attribute, DuplicateAttributeException, Layout, Material, MaterialLibrary, Mesh, TYPES, downloadModels, downloadMeshes, initMeshBuffers, deleteMeshBuffers, version */function(module,__webpack_exports__,__webpack_require__){"use strict";eval('__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "version", function() { return version; });\n/* harmony import */ var _mesh__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./mesh */ "./src/mesh.ts");\n/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "Mesh", function() { return _mesh__WEBPACK_IMPORTED_MODULE_0__["default"]; });\n\n/* harmony import */ var _material__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./material */ "./src/material.ts");\n/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "Material", function() { return _material__WEBPACK_IMPORTED_MODULE_1__["Material"]; });\n\n/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "MaterialLibrary", function() { return _material__WEBPACK_IMPORTED_MODULE_1__["MaterialLibrary"]; });\n\n/* harmony import */ var _layout__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./layout */ "./src/layout.ts");\n/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "Attribute", function() { return _layout__WEBPACK_IMPORTED_MODULE_2__["Attribute"]; });\n\n/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "DuplicateAttributeException", function() { return _layout__WEBPACK_IMPORTED_MODULE_2__["DuplicateAttributeException"]; });\n\n/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "Layout", function() { return _layout__WEBPACK_IMPORTED_MODULE_2__["Layout"]; });\n\n/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "TYPES", function() { return _layout__WEBPACK_IMPORTED_MODULE_2__["TYPES"]; });\n\n/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./utils */ "./src/utils.ts");\n/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "downloadModels", function() { return _utils__WEBPACK_IMPORTED_MODULE_3__["downloadModels"]; });\n\n/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "downloadMeshes", function() { return _utils__WEBPACK_IMPORTED_MODULE_3__["downloadMeshes"]; });\n\n/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "initMeshBuffers", function() { return _utils__WEBPACK_IMPORTED_MODULE_3__["initMeshBuffers"]; });\n\n/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "deleteMeshBuffers", function() { return _utils__WEBPACK_IMPORTED_MODULE_3__["deleteMeshBuffers"]; });\n\n\n\n\n\nconst version = "2.0.3";\n/**\n * @namespace\n */\n\n\n\n//# sourceURL=webpack://OBJ/./src/index.ts?')},"./src/layout.ts":
/*!***********************!*\
  !*** ./src/layout.ts ***!
  \***********************/
/*! exports provided: TYPES, DuplicateAttributeException, Attribute, Layout */function(module,__webpack_exports__,__webpack_require__){"use strict";eval('__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "TYPES", function() { return TYPES; });\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "DuplicateAttributeException", function() { return DuplicateAttributeException; });\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Attribute", function() { return Attribute; });\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Layout", function() { return Layout; });\nvar TYPES;\n(function (TYPES) {\n    TYPES["BYTE"] = "BYTE";\n    TYPES["UNSIGNED_BYTE"] = "UNSIGNED_BYTE";\n    TYPES["SHORT"] = "SHORT";\n    TYPES["UNSIGNED_SHORT"] = "UNSIGNED_SHORT";\n    TYPES["FLOAT"] = "FLOAT";\n})(TYPES || (TYPES = {}));\n/**\n * An exception for when two or more of the same attributes are found in the\n * same layout.\n * @private\n */\nclass DuplicateAttributeException extends Error {\n    /**\n     * Create a DuplicateAttributeException\n     * @param {Attribute} attribute - The attribute that was found more than\n     *        once in the {@link Layout}\n     */\n    constructor(attribute) {\n        super(`found duplicate attribute: ${attribute.key}`);\n    }\n}\n/**\n * Represents how a vertex attribute should be packed into an buffer.\n * @private\n */\nclass Attribute {\n    /**\n     * Create an attribute. Do not call this directly, use the predefined\n     * constants.\n     * @param {string} key - The name of this attribute as if it were a key in\n     *        an Object. Use the camel case version of the upper snake case\n     *        const name.\n     * @param {number} size - The number of components per vertex attribute.\n     *        Must be 1, 2, 3, or 4.\n     * @param {string} type - The data type of each component for this\n     *        attribute. Possible values:<br/>\n     *        "BYTE": signed 8-bit integer, with values in [-128, 127]<br/>\n     *        "SHORT": signed 16-bit integer, with values in\n     *            [-32768, 32767]<br/>\n     *        "UNSIGNED_BYTE": unsigned 8-bit integer, with values in\n     *            [0, 255]<br/>\n     *        "UNSIGNED_SHORT": unsigned 16-bit integer, with values in\n     *            [0, 65535]<br/>\n     *        "FLOAT": 32-bit floating point number\n     * @param {boolean} normalized - Whether integer data values should be\n     *        normalized when being casted to a float.<br/>\n     *        If true, signed integers are normalized to [-1, 1].<br/>\n     *        If true, unsigned integers are normalized to [0, 1].<br/>\n     *        For type "FLOAT", this parameter has no effect.\n     */\n    constructor(key, size, type, normalized = false) {\n        this.key = key;\n        this.size = size;\n        this.type = type;\n        this.normalized = normalized;\n        switch (type) {\n            case "BYTE":\n            case "UNSIGNED_BYTE":\n                this.sizeOfType = 1;\n                break;\n            case "SHORT":\n            case "UNSIGNED_SHORT":\n                this.sizeOfType = 2;\n                break;\n            case "FLOAT":\n                this.sizeOfType = 4;\n                break;\n            default:\n                throw new Error(`Unknown gl type: ${type}`);\n        }\n        this.sizeInBytes = this.sizeOfType * size;\n    }\n}\n/**\n * A class to represent the memory layout for a vertex attribute array. Used by\n * {@link Mesh}\'s TBD(...) method to generate a packed array from mesh data.\n * <p>\n * Layout can sort of be thought of as a C-style struct declaration.\n * {@link Mesh}\'s TBD(...) method will use the {@link Layout} instance to\n * pack an array in the given attribute order.\n * <p>\n * Layout also is very helpful when calling a WebGL context\'s\n * <code>vertexAttribPointer</code> method. If you\'ve created a buffer using\n * a Layout instance, then the same Layout instance can be used to determine\n * the size, type, normalized, stride, and offset parameters for\n * <code>vertexAttribPointer</code>.\n * <p>\n * For example:\n * <pre><code>\n *\n * const index = glctx.getAttribLocation(shaderProgram, "pos");\n * glctx.vertexAttribPointer(\n *   layout.position.size,\n *   glctx[layout.position.type],\n *   layout.position.normalized,\n *   layout.position.stride,\n *   layout.position.offset);\n * </code></pre>\n * @see {@link Mesh}\n */\nclass Layout {\n    /**\n     * Create a Layout object. This constructor will throw if any duplicate\n     * attributes are given.\n     * @param {Array} ...attributes - An ordered list of attributes that\n     *        describe the desired memory layout for each vertex attribute.\n     *        <p>\n     *\n     * @see {@link Mesh}\n     */\n    constructor(...attributes) {\n        this.attributes = attributes;\n        this.attributeMap = {};\n        let offset = 0;\n        let maxStrideMultiple = 0;\n        for (const attribute of attributes) {\n            if (this.attributeMap[attribute.key]) {\n                throw new DuplicateAttributeException(attribute);\n            }\n            // Add padding to satisfy WebGL\'s requirement that all\n            // vertexAttribPointer calls have an offset that is a multiple of\n            // the type size.\n            if (offset % attribute.sizeOfType !== 0) {\n                offset += attribute.sizeOfType - (offset % attribute.sizeOfType);\n                console.warn("Layout requires padding before " + attribute.key + " attribute");\n            }\n            this.attributeMap[attribute.key] = {\n                attribute: attribute,\n                size: attribute.size,\n                type: attribute.type,\n                normalized: attribute.normalized,\n                offset: offset,\n            };\n            offset += attribute.sizeInBytes;\n            maxStrideMultiple = Math.max(maxStrideMultiple, attribute.sizeOfType);\n        }\n        // Add padding to the end to satisfy WebGL\'s requirement that all\n        // vertexAttribPointer calls have a stride that is a multiple of the\n        // type size. Because we\'re putting differently sized attributes into\n        // the same buffer, it must be padded to a multiple of the largest\n        // type size.\n        if (offset % maxStrideMultiple !== 0) {\n            offset += maxStrideMultiple - (offset % maxStrideMultiple);\n            console.warn("Layout requires padding at the back");\n        }\n        this.stride = offset;\n        for (const attribute of attributes) {\n            this.attributeMap[attribute.key].stride = this.stride;\n        }\n    }\n}\n// Geometry attributes\n/**\n * Attribute layout to pack a vertex\'s x, y, & z as floats\n *\n * @see {@link Layout}\n */\nLayout.POSITION = new Attribute("position", 3, TYPES.FLOAT);\n/**\n * Attribute layout to pack a vertex\'s normal\'s x, y, & z as floats\n *\n * @see {@link Layout}\n */\nLayout.NORMAL = new Attribute("normal", 3, TYPES.FLOAT);\n/**\n * Attribute layout to pack a vertex\'s normal\'s x, y, & z as floats.\n * <p>\n * This value will be computed on-the-fly based on the texture coordinates.\n * If no texture coordinates are available, the generated value will default to\n * 0, 0, 0.\n *\n * @see {@link Layout}\n */\nLayout.TANGENT = new Attribute("tangent", 3, TYPES.FLOAT);\n/**\n * Attribute layout to pack a vertex\'s normal\'s bitangent x, y, & z as floats.\n * <p>\n * This value will be computed on-the-fly based on the texture coordinates.\n * If no texture coordinates are available, the generated value will default to\n * 0, 0, 0.\n * @see {@link Layout}\n */\nLayout.BITANGENT = new Attribute("bitangent", 3, TYPES.FLOAT);\n/**\n * Attribute layout to pack a vertex\'s texture coordinates\' u & v as floats\n *\n * @see {@link Layout}\n */\nLayout.UV = new Attribute("uv", 2, TYPES.FLOAT);\n// Material attributes\n/**\n * Attribute layout to pack an unsigned short to be interpreted as a the index\n * into a {@link Mesh}\'s materials list.\n * <p>\n * The intention of this value is to send all of the {@link Mesh}\'s materials\n * into multiple shader uniforms and then reference the current one by this\n * vertex attribute.\n * <p>\n * example glsl code:\n *\n * <pre><code>\n *  // this is bound using MATERIAL_INDEX\n *  attribute int materialIndex;\n *\n *  struct Material {\n *    vec3 diffuse;\n *    vec3 specular;\n *    vec3 specularExponent;\n *  };\n *\n *  uniform Material materials[MAX_MATERIALS];\n *\n *  // ...\n *\n *  vec3 diffuse = materials[materialIndex];\n *\n * </code></pre>\n * TODO: More description & test to make sure subscripting by attributes even\n * works for webgl\n *\n * @see {@link Layout}\n */\nLayout.MATERIAL_INDEX = new Attribute("materialIndex", 1, TYPES.SHORT);\nLayout.MATERIAL_ENABLED = new Attribute("materialEnabled", 1, TYPES.UNSIGNED_SHORT);\nLayout.AMBIENT = new Attribute("ambient", 3, TYPES.FLOAT);\nLayout.DIFFUSE = new Attribute("diffuse", 3, TYPES.FLOAT);\nLayout.SPECULAR = new Attribute("specular", 3, TYPES.FLOAT);\nLayout.SPECULAR_EXPONENT = new Attribute("specularExponent", 3, TYPES.FLOAT);\nLayout.EMISSIVE = new Attribute("emissive", 3, TYPES.FLOAT);\nLayout.TRANSMISSION_FILTER = new Attribute("transmissionFilter", 3, TYPES.FLOAT);\nLayout.DISSOLVE = new Attribute("dissolve", 1, TYPES.FLOAT);\nLayout.ILLUMINATION = new Attribute("illumination", 1, TYPES.UNSIGNED_SHORT);\nLayout.REFRACTION_INDEX = new Attribute("refractionIndex", 1, TYPES.FLOAT);\nLayout.SHARPNESS = new Attribute("sharpness", 1, TYPES.FLOAT);\nLayout.MAP_DIFFUSE = new Attribute("mapDiffuse", 1, TYPES.SHORT);\nLayout.MAP_AMBIENT = new Attribute("mapAmbient", 1, TYPES.SHORT);\nLayout.MAP_SPECULAR = new Attribute("mapSpecular", 1, TYPES.SHORT);\nLayout.MAP_SPECULAR_EXPONENT = new Attribute("mapSpecularExponent", 1, TYPES.SHORT);\nLayout.MAP_DISSOLVE = new Attribute("mapDissolve", 1, TYPES.SHORT);\nLayout.ANTI_ALIASING = new Attribute("antiAliasing", 1, TYPES.UNSIGNED_SHORT);\nLayout.MAP_BUMP = new Attribute("mapBump", 1, TYPES.SHORT);\nLayout.MAP_DISPLACEMENT = new Attribute("mapDisplacement", 1, TYPES.SHORT);\nLayout.MAP_DECAL = new Attribute("mapDecal", 1, TYPES.SHORT);\nLayout.MAP_EMISSIVE = new Attribute("mapEmissive", 1, TYPES.SHORT);\n\n\n//# sourceURL=webpack://OBJ/./src/layout.ts?')},"./src/material.ts":
/*!*************************!*\
  !*** ./src/material.ts ***!
  \*************************/
/*! exports provided: Material, MaterialLibrary */function(module,__webpack_exports__,__webpack_require__){"use strict";eval('__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Material", function() { return Material; });\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "MaterialLibrary", function() { return MaterialLibrary; });\n/**\n * The Material class.\n */\nclass Material {\n    constructor(name) {\n        this.name = name;\n        /**\n         * Constructor\n         * @param {String} name the unique name of the material\n         */\n        // The values for the following attibutes\n        // are an array of R, G, B normalized values.\n        // Ka - Ambient Reflectivity\n        this.ambient = [0, 0, 0];\n        // Kd - Defuse Reflectivity\n        this.diffuse = [0, 0, 0];\n        // Ks\n        this.specular = [0, 0, 0];\n        // Ke\n        this.emissive = [0, 0, 0];\n        // Tf\n        this.transmissionFilter = [0, 0, 0];\n        // d\n        this.dissolve = 0;\n        // valid range is between 0 and 1000\n        this.specularExponent = 0;\n        // either d or Tr; valid values are normalized\n        this.transparency = 0;\n        // illum - the enum of the illumination model to use\n        this.illumination = 0;\n        // Ni - Set to "normal" (air).\n        this.refractionIndex = 1;\n        // sharpness\n        this.sharpness = 0;\n        // map_Kd\n        this.mapDiffuse = emptyTextureOptions();\n        // map_Ka\n        this.mapAmbient = emptyTextureOptions();\n        // map_Ks\n        this.mapSpecular = emptyTextureOptions();\n        // map_Ns\n        this.mapSpecularExponent = emptyTextureOptions();\n        // map_d\n        this.mapDissolve = emptyTextureOptions();\n        // map_aat\n        this.antiAliasing = false;\n        // map_bump or bump\n        this.mapBump = emptyTextureOptions();\n        // disp\n        this.mapDisplacement = emptyTextureOptions();\n        // decal\n        this.mapDecal = emptyTextureOptions();\n        // map_Ke\n        this.mapEmissive = emptyTextureOptions();\n        // refl - when the reflection type is a cube, there will be multiple refl\n        //        statements for each side of the cube. If it\'s a spherical\n        //        reflection, there should only ever be one.\n        this.mapReflections = [];\n    }\n}\nconst SENTINEL_MATERIAL = new Material("sentinel");\n/**\n * https://en.wikipedia.org/wiki/Wavefront_.obj_file\n * http://paulbourke.net/dataformats/mtl/\n */\nclass MaterialLibrary {\n    constructor(data) {\n        this.data = data;\n        /**\n         * Constructs the Material Parser\n         * @param mtlData the MTL file contents\n         */\n        this.currentMaterial = SENTINEL_MATERIAL;\n        this.materials = {};\n        this.parse();\n    }\n    /* eslint-disable camelcase */\n    /* the function names here disobey camelCase conventions\n     to make parsing/routing easier. see the parse function\n     documentation for more information. */\n    /**\n     * Creates a new Material object and adds to the registry.\n     * @param tokens the tokens associated with the directive\n     */\n    parse_newmtl(tokens) {\n        const name = tokens[0];\n        // console.info(\'Parsing new Material:\', name);\n        this.currentMaterial = new Material(name);\n        this.materials[name] = this.currentMaterial;\n    }\n    /**\n     * See the documenation for parse_Ka below for a better understanding.\n     *\n     * Given a list of possible color tokens, returns an array of R, G, and B\n     * color values.\n     *\n     * @param tokens the tokens associated with the directive\n     * @return {*} a 3 element array containing the R, G, and B values\n     * of the color.\n     */\n    parseColor(tokens) {\n        if (tokens[0] == "spectral") {\n            throw new Error("The MTL parser does not support spectral curve files. You will " +\n                "need to convert the MTL colors to either RGB or CIEXYZ.");\n        }\n        if (tokens[0] == "xyz") {\n            throw new Error("The MTL parser does not currently support XYZ colors. Either convert the " +\n                "XYZ values to RGB or create an issue to add support for XYZ");\n        }\n        // from my understanding of the spec, RGB values at this point\n        // will either be 3 floats or exactly 1 float, so that\'s the check\n        // that i\'m going to perform here\n        if (tokens.length == 3) {\n            const [x, y, z] = tokens;\n            return [parseFloat(x), parseFloat(y), parseFloat(z)];\n        }\n        // Since tokens at this point has a length of 3, we\'re going to assume\n        // it\'s exactly 1, skipping the check for 2.\n        const value = parseFloat(tokens[0]);\n        // in this case, all values are equivalent\n        return [value, value, value];\n    }\n    /**\n     * Parse the ambient reflectivity\n     *\n     * A Ka directive can take one of three forms:\n     *   - Ka r g b\n     *   - Ka spectral file.rfl\n     *   - Ka xyz x y z\n     * These three forms are mutually exclusive in that only one\n     * declaration can exist per material. It is considered a syntax\n     * error otherwise.\n     *\n     * The "Ka" form specifies the ambient reflectivity using RGB values.\n     * The "g" and "b" values are optional. If only the "r" value is\n     * specified, then the "g" and "b" values are assigned the value of\n     * "r". Values are normally in the range 0.0 to 1.0. Values outside\n     * of this range increase or decrease the reflectivity accordingly.\n     *\n     * The "Ka spectral" form specifies the ambient reflectivity using a\n     * spectral curve. "file.rfl" is the name of the ".rfl" file containing\n     * the curve data. "factor" is an optional argument which is a multiplier\n     * for the values in the .rfl file and defaults to 1.0 if not specified.\n     *\n     * The "Ka xyz" form specifies the ambient reflectivity using CIEXYZ values.\n     * "x y z" are the values of the CIEXYZ color space. The "y" and "z" arguments\n     * are optional and take on the value of the "x" component if only "x" is\n     * specified. The "x y z" values are normally in the range of 0.0 to 1.0 and\n     * increase or decrease ambient reflectivity accordingly outside of that\n     * range.\n     *\n     * @param tokens the tokens associated with the directive\n     */\n    parse_Ka(tokens) {\n        this.currentMaterial.ambient = this.parseColor(tokens);\n    }\n    /**\n     * Diffuse Reflectivity\n     *\n     * Similar to the Ka directive. Simply replace "Ka" with "Kd" and the rules\n     * are the same\n     *\n     * @param tokens the tokens associated with the directive\n     */\n    parse_Kd(tokens) {\n        this.currentMaterial.diffuse = this.parseColor(tokens);\n    }\n    /**\n     * Spectral Reflectivity\n     *\n     * Similar to the Ka directive. Simply replace "Ks" with "Kd" and the rules\n     * are the same\n     *\n     * @param tokens the tokens associated with the directive\n     */\n    parse_Ks(tokens) {\n        this.currentMaterial.specular = this.parseColor(tokens);\n    }\n    /**\n     * Emissive\n     *\n     * The amount and color of light emitted by the object.\n     *\n     * @param tokens the tokens associated with the directive\n     */\n    parse_Ke(tokens) {\n        this.currentMaterial.emissive = this.parseColor(tokens);\n    }\n    /**\n     * Transmission Filter\n     *\n     * Any light passing through the object is filtered by the transmission\n     * filter, which only allows specific colors to pass through. For example, Tf\n     * 0 1 0 allows all of the green to pass through and filters out all of the\n     * red and blue.\n     *\n     * Similar to the Ka directive. Simply replace "Ks" with "Tf" and the rules\n     * are the same\n     *\n     * @param tokens the tokens associated with the directive\n     */\n    parse_Tf(tokens) {\n        this.currentMaterial.transmissionFilter = this.parseColor(tokens);\n    }\n    /**\n     * Specifies the dissolve for the current material.\n     *\n     * Statement: d [-halo] `factor`\n     *\n     * Example: "d 0.5"\n     *\n     * The factor is the amount this material dissolves into the background. A\n     * factor of 1.0 is fully opaque. This is the default when a new material is\n     * created. A factor of 0.0 is fully dissolved (completely transparent).\n     *\n     * Unlike a real transparent material, the dissolve does not depend upon\n     * material thickness nor does it have any spectral character. Dissolve works\n     * on all illumination models.\n     *\n     * The dissolve statement allows for an optional "-halo" flag which indicates\n     * that a dissolve is dependent on the surface orientation relative to the\n     * viewer. For example, a sphere with the following dissolve, "d -halo 0.0",\n     * will be fully dissolved at its center and will appear gradually more opaque\n     * toward its edge.\n     *\n     * "factor" is the minimum amount of dissolve applied to the material. The\n     * amount of dissolve will vary between 1.0 (fully opaque) and the specified\n     * "factor". The formula is:\n     *\n     *    dissolve = 1.0 - (N*v)(1.0-factor)\n     *\n     * @param tokens the tokens associated with the directive\n     */\n    parse_d(tokens) {\n        // this ignores the -halo option as I can\'t find any documentation on what\n        // it\'s supposed to be.\n        this.currentMaterial.dissolve = parseFloat(tokens.pop() || "0");\n    }\n    /**\n     * The "illum" statement specifies the illumination model to use in the\n     * material. Illumination models are mathematical equations that represent\n     * various material lighting and shading effects.\n     *\n     * The illumination number can be a number from 0 to 10. The following are\n     * the list of illumination enumerations and their summaries:\n     * 0. Color on and Ambient off\n     * 1. Color on and Ambient on\n     * 2. Highlight on\n     * 3. Reflection on and Ray trace on\n     * 4. Transparency: Glass on, Reflection: Ray trace on\n     * 5. Reflection: Fresnel on and Ray trace on\n     * 6. Transparency: Refraction on, Reflection: Fresnel off and Ray trace on\n     * 7. Transparency: Refraction on, Reflection: Fresnel on and Ray trace on\n     * 8. Reflection on and Ray trace off\n     * 9. Transparency: Glass on, Reflection: Ray trace off\n     * 10. Casts shadows onto invisible surfaces\n     *\n     * Example: "illum 2" to specify the "Highlight on" model\n     *\n     * @param tokens the tokens associated with the directive\n     */\n    parse_illum(tokens) {\n        this.currentMaterial.illumination = parseInt(tokens[0]);\n    }\n    /**\n     * Optical Density (AKA Index of Refraction)\n     *\n     * Statement: Ni `index`\n     *\n     * Example: Ni 1.0\n     *\n     * Specifies the optical density for the surface. `index` is the value\n     * for the optical density. The values can range from 0.001 to 10.  A value of\n     * 1.0 means that light does not bend as it passes through an object.\n     * Increasing the optical_density increases the amount of bending. Glass has\n     * an index of refraction of about 1.5. Values of less than 1.0 produce\n     * bizarre results and are not recommended\n     *\n     * @param tokens the tokens associated with the directive\n     */\n    parse_Ni(tokens) {\n        this.currentMaterial.refractionIndex = parseFloat(tokens[0]);\n    }\n    /**\n     * Specifies the specular exponent for the current material. This defines the\n     * focus of the specular highlight.\n     *\n     * Statement: Ns `exponent`\n     *\n     * Example: "Ns 250"\n     *\n     * `exponent` is the value for the specular exponent. A high exponent results\n     * in a tight, concentrated highlight. Ns Values normally range from 0 to\n     * 1000.\n     *\n     * @param tokens the tokens associated with the directive\n     */\n    parse_Ns(tokens) {\n        this.currentMaterial.specularExponent = parseInt(tokens[0]);\n    }\n    /**\n     * Specifies the sharpness of the reflections from the local reflection map.\n     *\n     * Statement: sharpness `value`\n     *\n     * Example: "sharpness 100"\n     *\n     * If a material does not have a local reflection map defined in its material\n     * defintions, sharpness will apply to the global reflection map defined in\n     * PreView.\n     *\n     * `value` can be a number from 0 to 1000. The default is 60. A high value\n     * results in a clear reflection of objects in the reflection map.\n     *\n     * Tip: sharpness values greater than 100 introduce aliasing effects in\n     * flat surfaces that are viewed at a sharp angle.\n     *\n     * @param tokens the tokens associated with the directive\n     */\n    parse_sharpness(tokens) {\n        this.currentMaterial.sharpness = parseInt(tokens[0]);\n    }\n    /**\n     * Parses the -cc flag and updates the options object with the values.\n     *\n     * @param values the values passed to the -cc flag\n     * @param options the Object of all image options\n     */\n    parse_cc(values, options) {\n        options.colorCorrection = values[0] == "on";\n    }\n    /**\n     * Parses the -blendu flag and updates the options object with the values.\n     *\n     * @param values the values passed to the -blendu flag\n     * @param options the Object of all image options\n     */\n    parse_blendu(values, options) {\n        options.horizontalBlending = values[0] == "on";\n    }\n    /**\n     * Parses the -blendv flag and updates the options object with the values.\n     *\n     * @param values the values passed to the -blendv flag\n     * @param options the Object of all image options\n     */\n    parse_blendv(values, options) {\n        options.verticalBlending = values[0] == "on";\n    }\n    /**\n     * Parses the -boost flag and updates the options object with the values.\n     *\n     * @param values the values passed to the -boost flag\n     * @param options the Object of all image options\n     */\n    parse_boost(values, options) {\n        options.boostMipMapSharpness = parseFloat(values[0]);\n    }\n    /**\n     * Parses the -mm flag and updates the options object with the values.\n     *\n     * @param values the values passed to the -mm flag\n     * @param options the Object of all image options\n     */\n    parse_mm(values, options) {\n        options.modifyTextureMap.brightness = parseFloat(values[0]);\n        options.modifyTextureMap.contrast = parseFloat(values[1]);\n    }\n    /**\n     * Parses and sets the -o, -s, and -t  u, v, and w values\n     *\n     * @param values the values passed to the -o, -s, -t flag\n     * @param {Object} option the Object of either the -o, -s, -t option\n     * @param {Integer} defaultValue the Object of all image options\n     */\n    parse_ost(values, option, defaultValue) {\n        while (values.length < 3) {\n            values.push(defaultValue.toString());\n        }\n        option.u = parseFloat(values[0]);\n        option.v = parseFloat(values[1]);\n        option.w = parseFloat(values[2]);\n    }\n    /**\n     * Parses the -o flag and updates the options object with the values.\n     *\n     * @param values the values passed to the -o flag\n     * @param options the Object of all image options\n     */\n    parse_o(values, options) {\n        this.parse_ost(values, options.offset, 0);\n    }\n    /**\n     * Parses the -s flag and updates the options object with the values.\n     *\n     * @param values the values passed to the -s flag\n     * @param options the Object of all image options\n     */\n    parse_s(values, options) {\n        this.parse_ost(values, options.scale, 1);\n    }\n    /**\n     * Parses the -t flag and updates the options object with the values.\n     *\n     * @param values the values passed to the -t flag\n     * @param options the Object of all image options\n     */\n    parse_t(values, options) {\n        this.parse_ost(values, options.turbulence, 0);\n    }\n    /**\n     * Parses the -texres flag and updates the options object with the values.\n     *\n     * @param values the values passed to the -texres flag\n     * @param options the Object of all image options\n     */\n    parse_texres(values, options) {\n        options.textureResolution = parseFloat(values[0]);\n    }\n    /**\n     * Parses the -clamp flag and updates the options object with the values.\n     *\n     * @param values the values passed to the -clamp flag\n     * @param options the Object of all image options\n     */\n    parse_clamp(values, options) {\n        options.clamp = values[0] == "on";\n    }\n    /**\n     * Parses the -bm flag and updates the options object with the values.\n     *\n     * @param values the values passed to the -bm flag\n     * @param options the Object of all image options\n     */\n    parse_bm(values, options) {\n        options.bumpMultiplier = parseFloat(values[0]);\n    }\n    /**\n     * Parses the -imfchan flag and updates the options object with the values.\n     *\n     * @param values the values passed to the -imfchan flag\n     * @param options the Object of all image options\n     */\n    parse_imfchan(values, options) {\n        options.imfChan = values[0];\n    }\n    /**\n     * This only exists for relection maps and denotes the type of reflection.\n     *\n     * @param values the values passed to the -type flag\n     * @param options the Object of all image options\n     */\n    parse_type(values, options) {\n        options.reflectionType = values[0];\n    }\n    /**\n     * Parses the texture\'s options and returns an options object with the info\n     *\n     * @param tokens all of the option tokens to pass to the texture\n     * @return {Object} a complete object of objects to apply to the texture\n     */\n    parseOptions(tokens) {\n        const options = emptyTextureOptions();\n        let option;\n        let values;\n        const optionsToValues = {};\n        tokens.reverse();\n        while (tokens.length) {\n            // token is guaranteed to exists here, hence the explicit "as"\n            const token = tokens.pop();\n            if (token.startsWith("-")) {\n                option = token.substr(1);\n                optionsToValues[option] = [];\n            }\n            else if (option) {\n                optionsToValues[option].push(token);\n            }\n        }\n        for (option in optionsToValues) {\n            if (!optionsToValues.hasOwnProperty(option)) {\n                continue;\n            }\n            values = optionsToValues[option];\n            const optionMethod = this[`parse_${option}`];\n            if (optionMethod) {\n                optionMethod.bind(this)(values, options);\n            }\n        }\n        return options;\n    }\n    /**\n     * Parses the given texture map line.\n     *\n     * @param tokens all of the tokens representing the texture\n     * @return a complete object of objects to apply to the texture\n     */\n    parseMap(tokens) {\n        // according to wikipedia:\n        // (https://en.wikipedia.org/wiki/Wavefront_.obj_file#Vendor_specific_alterations)\n        // there is at least one vendor that places the filename before the options\n        // rather than after (which is to spec). All options start with a \'-\'\n        // so if the first token doesn\'t start with a \'-\', we\'re going to assume\n        // it\'s the name of the map file.\n        let optionsString;\n        let filename = "";\n        if (!tokens[0].startsWith("-")) {\n            [filename, ...optionsString] = tokens;\n        }\n        else {\n            filename = tokens.pop();\n            optionsString = tokens;\n        }\n        const options = this.parseOptions(optionsString);\n        options.filename = filename.replace(/\\\\/g, "/");\n        return options;\n    }\n    /**\n     * Parses the ambient map.\n     *\n     * @param tokens list of tokens for the map_Ka direcive\n     */\n    parse_map_Ka(tokens) {\n        this.currentMaterial.mapAmbient = this.parseMap(tokens);\n    }\n    /**\n     * Parses the diffuse map.\n     *\n     * @param tokens list of tokens for the map_Kd direcive\n     */\n    parse_map_Kd(tokens) {\n        this.currentMaterial.mapDiffuse = this.parseMap(tokens);\n    }\n    /**\n     * Parses the specular map.\n     *\n     * @param tokens list of tokens for the map_Ks direcive\n     */\n    parse_map_Ks(tokens) {\n        this.currentMaterial.mapSpecular = this.parseMap(tokens);\n    }\n    /**\n     * Parses the emissive map.\n     *\n     * @param tokens list of tokens for the map_Ke direcive\n     */\n    parse_map_Ke(tokens) {\n        this.currentMaterial.mapEmissive = this.parseMap(tokens);\n    }\n    /**\n     * Parses the specular exponent map.\n     *\n     * @param tokens list of tokens for the map_Ns direcive\n     */\n    parse_map_Ns(tokens) {\n        this.currentMaterial.mapSpecularExponent = this.parseMap(tokens);\n    }\n    /**\n     * Parses the dissolve map.\n     *\n     * @param tokens list of tokens for the map_d direcive\n     */\n    parse_map_d(tokens) {\n        this.currentMaterial.mapDissolve = this.parseMap(tokens);\n    }\n    /**\n     * Parses the anti-aliasing option.\n     *\n     * @param tokens list of tokens for the map_aat direcive\n     */\n    parse_map_aat(tokens) {\n        this.currentMaterial.antiAliasing = tokens[0] == "on";\n    }\n    /**\n     * Parses the bump map.\n     *\n     * @param tokens list of tokens for the map_bump direcive\n     */\n    parse_map_bump(tokens) {\n        this.currentMaterial.mapBump = this.parseMap(tokens);\n    }\n    /**\n     * Parses the bump map.\n     *\n     * @param tokens list of tokens for the bump direcive\n     */\n    parse_bump(tokens) {\n        this.parse_map_bump(tokens);\n    }\n    /**\n     * Parses the disp map.\n     *\n     * @param tokens list of tokens for the disp direcive\n     */\n    parse_disp(tokens) {\n        this.currentMaterial.mapDisplacement = this.parseMap(tokens);\n    }\n    /**\n     * Parses the decal map.\n     *\n     * @param tokens list of tokens for the map_decal direcive\n     */\n    parse_decal(tokens) {\n        this.currentMaterial.mapDecal = this.parseMap(tokens);\n    }\n    /**\n     * Parses the refl map.\n     *\n     * @param tokens list of tokens for the refl direcive\n     */\n    parse_refl(tokens) {\n        this.currentMaterial.mapReflections.push(this.parseMap(tokens));\n    }\n    /**\n     * Parses the MTL file.\n     *\n     * Iterates line by line parsing each MTL directive.\n     *\n     * This function expects the first token in the line\n     * to be a valid MTL directive. That token is then used\n     * to try and run a method on this class. parse_[directive]\n     * E.g., the `newmtl` directive would try to call the method\n     * parse_newmtl. Each parsing function takes in the remaining\n     * list of tokens and updates the currentMaterial class with\n     * the attributes provided.\n     */\n    parse() {\n        const lines = this.data.split(/\\r?\\n/);\n        for (let line of lines) {\n            line = line.trim();\n            if (!line || line.startsWith("#")) {\n                continue;\n            }\n            const [directive, ...tokens] = line.split(/\\s/);\n            const parseMethod = this[`parse_${directive}`];\n            if (!parseMethod) {\n                console.warn(`Don\'t know how to parse the directive: "${directive}"`);\n                continue;\n            }\n            // console.log(`Parsing "${directive}" with tokens: ${tokens}`);\n            parseMethod.bind(this)(tokens);\n        }\n        // some cleanup. These don\'t need to be exposed as public data.\n        delete this.data;\n        this.currentMaterial = SENTINEL_MATERIAL;\n    }\n}\nfunction emptyTextureOptions() {\n    return {\n        colorCorrection: false,\n        horizontalBlending: true,\n        verticalBlending: true,\n        boostMipMapSharpness: 0,\n        modifyTextureMap: {\n            brightness: 0,\n            contrast: 1,\n        },\n        offset: { u: 0, v: 0, w: 0 },\n        scale: { u: 1, v: 1, w: 1 },\n        turbulence: { u: 0, v: 0, w: 0 },\n        clamp: false,\n        textureResolution: null,\n        bumpMultiplier: 1,\n        imfChan: null,\n        filename: "",\n    };\n}\n\n\n//# sourceURL=webpack://OBJ/./src/material.ts?')},"./src/mesh.ts":
/*!*********************!*\
  !*** ./src/mesh.ts ***!
  \*********************/
/*! exports provided: default */function(module,__webpack_exports__,__webpack_require__){"use strict";eval('__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return Mesh; });\n/* harmony import */ var _layout__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./layout */ "./src/layout.ts");\n\n/**\n * The main Mesh class. The constructor will parse through the OBJ file data\n * and collect the vertex, vertex normal, texture, and face information. This\n * information can then be used later on when creating your VBOs. See\n * OBJ.initMeshBuffers for an example of how to use the newly created Mesh\n */\nclass Mesh {\n    /**\n     * Create a Mesh\n     * @param {String} objectData - a string representation of an OBJ file with\n     *     newlines preserved.\n     * @param {Object} options - a JS object containing valid options. See class\n     *     documentation for options.\n     * @param {bool} options.enableWTextureCoord - Texture coordinates can have\n     *     an optional "w" coordinate after the u and v coordinates. This extra\n     *     value can be used in order to perform fancy transformations on the\n     *     textures themselves. Default is to truncate to only the u an v\n     *     coordinates. Passing true will provide a default value of 0 in the\n     *     event that any or all texture coordinates don\'t provide a w value.\n     *     Always use the textureStride attribute in order to determine the\n     *     stride length of the texture coordinates when rendering the element\n     *     array.\n     * @param {bool} options.calcTangentsAndBitangents - Calculate the tangents\n     *     and bitangents when loading of the OBJ is completed. This adds two new\n     *     attributes to the Mesh instance: `tangents` and `bitangents`.\n     */\n    constructor(objectData, options) {\n        this.name = "";\n        this.indicesPerMaterial = [];\n        this.materialsByIndex = {};\n        this.tangents = [];\n        this.bitangents = [];\n        options = options || {};\n        options.materials = options.materials || {};\n        options.enableWTextureCoord = !!options.enableWTextureCoord;\n        // the list of unique vertex, normal, texture, attributes\n        this.vertexNormals = [];\n        this.textures = [];\n        // the indicies to draw the faces\n        this.indices = [];\n        this.textureStride = options.enableWTextureCoord ? 3 : 2;\n        /*\n        The OBJ file format does a sort of compression when saving a model in a\n        program like Blender. There are at least 3 sections (4 including textures)\n        within the file. Each line in a section begins with the same string:\n          * \'v\': indicates vertex section\n          * \'vn\': indicates vertex normal section\n          * \'f\': indicates the faces section\n          * \'vt\': indicates vertex texture section (if textures were used on the model)\n        Each of the above sections (except for the faces section) is a list/set of\n        unique vertices.\n\n        Each line of the faces section contains a list of\n        (vertex, [texture], normal) groups.\n\n        **Note:** The following documentation will use a capital "V" Vertex to\n        denote the above (vertex, [texture], normal) groups whereas a lowercase\n        "v" vertex is used to denote an X, Y, Z coordinate.\n\n        Some examples:\n            // the texture index is optional, both formats are possible for models\n            // without a texture applied\n            f 1/25 18/46 12/31\n            f 1//25 18//46 12//31\n\n            // A 3 vertex face with texture indices\n            f 16/92/11 14/101/22 1/69/1\n\n            // A 4 vertex face\n            f 16/92/11 40/109/40 38/114/38 14/101/22\n\n        The first two lines are examples of a 3 vertex face without a texture applied.\n        The second is an example of a 3 vertex face with a texture applied.\n        The third is an example of a 4 vertex face. Note: a face can contain N\n        number of vertices.\n\n        Each number that appears in one of the groups is a 1-based index\n        corresponding to an item from the other sections (meaning that indexing\n        starts at one and *not* zero).\n\n        For example:\n            `f 16/92/11` is saying to\n              - take the 16th element from the [v] vertex array\n              - take the 92nd element from the [vt] texture array\n              - take the 11th element from the [vn] normal array\n            and together they make a unique vertex.\n        Using all 3+ unique Vertices from the face line will produce a polygon.\n\n        Now, you could just go through the OBJ file and create a new vertex for\n        each face line and WebGL will draw what appears to be the same model.\n        However, vertices will be overlapped and duplicated all over the place.\n\n        Consider a cube in 3D space centered about the origin and each side is\n        2 units long. The front face (with the positive Z-axis pointing towards\n        you) would have a Top Right vertex (looking orthogonal to its normal)\n        mapped at (1,1,1) The right face would have a Top Left vertex (looking\n        orthogonal to its normal) at (1,1,1) and the top face would have a Bottom\n        Right vertex (looking orthogonal to its normal) at (1,1,1). Each face\n        has a vertex at the same coordinates, however, three distinct vertices\n        will be drawn at the same spot.\n\n        To solve the issue of duplicate Vertices (the `(vertex, [texture], normal)`\n        groups), while iterating through the face lines, when a group is encountered\n        the whole group string (\'16/92/11\') is checked to see if it exists in the\n        packed.hashindices object, and if it doesn\'t, the indices it specifies\n        are used to look up each attribute in the corresponding attribute arrays\n        already created. The values are then copied to the corresponding unpacked\n        array (flattened to play nice with WebGL\'s ELEMENT_ARRAY_BUFFER indexing),\n        the group string is added to the hashindices set and the current unpacked\n        index is used as this hashindices value so that the group of elements can\n        be reused. The unpacked index is incremented. If the group string already\n        exists in the hashindices object, its corresponding value is the index of\n        that group and is appended to the unpacked indices array.\n       */\n        const verts = [];\n        const vertNormals = [];\n        const textures = [];\n        const materialNamesByIndex = [];\n        const materialIndicesByName = {};\n        // keep track of what material we\'ve seen last\n        let currentMaterialIndex = -1;\n        let currentObjectByMaterialIndex = 0;\n        // unpacking stuff\n        const unpacked = {\n            verts: [],\n            norms: [],\n            textures: [],\n            hashindices: {},\n            indices: [[]],\n            materialIndices: [],\n            index: 0,\n        };\n        const VERTEX_RE = /^v\\s/;\n        const NORMAL_RE = /^vn\\s/;\n        const TEXTURE_RE = /^vt\\s/;\n        const FACE_RE = /^f\\s/;\n        const WHITESPACE_RE = /\\s+/;\n        const USE_MATERIAL_RE = /^usemtl/;\n        // array of lines separated by the newline\n        const lines = objectData.split("\\n");\n        for (let line of lines) {\n            line = line.trim();\n            if (!line || line.startsWith("#")) {\n                continue;\n            }\n            const elements = line.split(WHITESPACE_RE);\n            elements.shift();\n            if (VERTEX_RE.test(line)) {\n                // if this is a vertex\n                verts.push(...elements);\n            }\n            else if (NORMAL_RE.test(line)) {\n                // if this is a vertex normal\n                vertNormals.push(...elements);\n            }\n            else if (TEXTURE_RE.test(line)) {\n                let coords = elements;\n                // by default, the loader will only look at the U and V\n                // coordinates of the vt declaration. So, this truncates the\n                // elements to only those 2 values. If W texture coordinate\n                // support is enabled, then the texture coordinate is\n                // expected to have three values in it.\n                if (elements.length > 2 && !options.enableWTextureCoord) {\n                    coords = elements.slice(0, 2);\n                }\n                else if (elements.length === 2 && options.enableWTextureCoord) {\n                    // If for some reason W texture coordinate support is enabled\n                    // and only the U and V coordinates are given, then we supply\n                    // the default value of 0 so that the stride length is correct\n                    // when the textures are unpacked below.\n                    coords.push("0");\n                }\n                textures.push(...coords);\n            }\n            else if (USE_MATERIAL_RE.test(line)) {\n                const materialName = elements[0];\n                // check to see if we\'ve ever seen it before\n                if (!(materialName in materialIndicesByName)) {\n                    // new material we\'ve never seen\n                    materialNamesByIndex.push(materialName);\n                    materialIndicesByName[materialName] = materialNamesByIndex.length - 1;\n                    // push new array into indices\n                    // already contains an array at index zero, don\'t add\n                    if (materialIndicesByName[materialName] > 0) {\n                        unpacked.indices.push([]);\n                    }\n                }\n                // keep track of the current material index\n                currentMaterialIndex = materialIndicesByName[materialName];\n                // update current index array\n                currentObjectByMaterialIndex = currentMaterialIndex;\n            }\n            else if (FACE_RE.test(line)) {\n                // if this is a face\n                /*\n                split this face into an array of Vertex groups\n                for example:\n                   f 16/92/11 14/101/22 1/69/1\n                becomes:\n                  [\'16/92/11\', \'14/101/22\', \'1/69/1\'];\n                */\n                const triangles = triangulate(elements);\n                for (const triangle of triangles) {\n                    for (let j = 0, eleLen = triangle.length; j < eleLen; j++) {\n                        const hash = triangle[j] + "," + currentMaterialIndex;\n                        if (hash in unpacked.hashindices) {\n                            unpacked.indices[currentObjectByMaterialIndex].push(unpacked.hashindices[hash]);\n                        }\n                        else {\n                            /*\n                        Each element of the face line array is a Vertex which has its\n                        attributes delimited by a forward slash. This will separate\n                        each attribute into another array:\n                            \'19/92/11\'\n                        becomes:\n                            Vertex = [\'19\', \'92\', \'11\'];\n                        where\n                            Vertex[0] is the vertex index\n                            Vertex[1] is the texture index\n                            Vertex[2] is the normal index\n                         Think of faces having Vertices which are comprised of the\n                         attributes location (v), texture (vt), and normal (vn).\n                         */\n                            const vertex = triangle[j].split("/");\n                            // it\'s possible for faces to only specify the vertex\n                            // and the normal. In this case, vertex will only have\n                            // a length of 2 and not 3 and the normal will be the\n                            // second item in the list with an index of 1.\n                            const normalIndex = vertex.length - 1;\n                            /*\n                         The verts, textures, and vertNormals arrays each contain a\n                         flattend array of coordinates.\n\n                         Because it gets confusing by referring to Vertex and then\n                         vertex (both are different in my descriptions) I will explain\n                         what\'s going on using the vertexNormals array:\n\n                         vertex[2] will contain the one-based index of the vertexNormals\n                         section (vn). One is subtracted from this index number to play\n                         nice with javascript\'s zero-based array indexing.\n\n                         Because vertexNormal is a flattened array of x, y, z values,\n                         simple pointer arithmetic is used to skip to the start of the\n                         vertexNormal, then the offset is added to get the correct\n                         component: +0 is x, +1 is y, +2 is z.\n\n                         This same process is repeated for verts and textures.\n                         */\n                            // Vertex position\n                            unpacked.verts.push(+verts[(+vertex[0] - 1) * 3 + 0]);\n                            unpacked.verts.push(+verts[(+vertex[0] - 1) * 3 + 1]);\n                            unpacked.verts.push(+verts[(+vertex[0] - 1) * 3 + 2]);\n                            // Vertex textures\n                            if (textures.length) {\n                                const stride = options.enableWTextureCoord ? 3 : 2;\n                                unpacked.textures.push(+textures[(+vertex[1] - 1) * stride + 0]);\n                                unpacked.textures.push(+textures[(+vertex[1] - 1) * stride + 1]);\n                                if (options.enableWTextureCoord) {\n                                    unpacked.textures.push(+textures[(+vertex[1] - 1) * stride + 2]);\n                                }\n                            }\n                            // Vertex normals\n                            unpacked.norms.push(+vertNormals[(+vertex[normalIndex] - 1) * 3 + 0]);\n                            unpacked.norms.push(+vertNormals[(+vertex[normalIndex] - 1) * 3 + 1]);\n                            unpacked.norms.push(+vertNormals[(+vertex[normalIndex] - 1) * 3 + 2]);\n                            // Vertex material indices\n                            unpacked.materialIndices.push(currentMaterialIndex);\n                            // add the newly created Vertex to the list of indices\n                            unpacked.hashindices[hash] = unpacked.index;\n                            unpacked.indices[currentObjectByMaterialIndex].push(unpacked.hashindices[hash]);\n                            // increment the counter\n                            unpacked.index += 1;\n                        }\n                    }\n                }\n            }\n        }\n        this.vertices = unpacked.verts;\n        this.vertexNormals = unpacked.norms;\n        this.textures = unpacked.textures;\n        this.vertexMaterialIndices = unpacked.materialIndices;\n        this.indices = unpacked.indices[currentObjectByMaterialIndex];\n        this.indicesPerMaterial = unpacked.indices;\n        this.materialNames = materialNamesByIndex;\n        this.materialIndices = materialIndicesByName;\n        this.materialsByIndex = {};\n        if (options.calcTangentsAndBitangents) {\n            this.calculateTangentsAndBitangents();\n        }\n    }\n    /**\n     * Calculates the tangents and bitangents of the mesh that forms an orthogonal basis together with the\n     * normal in the direction of the texture coordinates. These are useful for setting up the TBN matrix\n     * when distorting the normals through normal maps.\n     * Method derived from: http://www.opengl-tutorial.org/intermediate-tutorials/tutorial-13-normal-mapping/\n     *\n     * This method requires the normals and texture coordinates to be parsed and set up correctly.\n     * Adds the tangents and bitangents as members of the class instance.\n     */\n    calculateTangentsAndBitangents() {\n        console.assert(!!(this.vertices &&\n            this.vertices.length &&\n            this.vertexNormals &&\n            this.vertexNormals.length &&\n            this.textures &&\n            this.textures.length), "Missing attributes for calculating tangents and bitangents");\n        const unpacked = {\n            tangents: [...new Array(this.vertices.length)].map(_ => 0),\n            bitangents: [...new Array(this.vertices.length)].map(_ => 0),\n        };\n        // Loop through all faces in the whole mesh\n        const indices = this.indices;\n        const vertices = this.vertices;\n        const normals = this.vertexNormals;\n        const uvs = this.textures;\n        for (let i = 0; i < indices.length; i += 3) {\n            const i0 = indices[i + 0];\n            const i1 = indices[i + 1];\n            const i2 = indices[i + 2];\n            const x_v0 = vertices[i0 * 3 + 0];\n            const y_v0 = vertices[i0 * 3 + 1];\n            const z_v0 = vertices[i0 * 3 + 2];\n            const x_uv0 = uvs[i0 * 2 + 0];\n            const y_uv0 = uvs[i0 * 2 + 1];\n            const x_v1 = vertices[i1 * 3 + 0];\n            const y_v1 = vertices[i1 * 3 + 1];\n            const z_v1 = vertices[i1 * 3 + 2];\n            const x_uv1 = uvs[i1 * 2 + 0];\n            const y_uv1 = uvs[i1 * 2 + 1];\n            const x_v2 = vertices[i2 * 3 + 0];\n            const y_v2 = vertices[i2 * 3 + 1];\n            const z_v2 = vertices[i2 * 3 + 2];\n            const x_uv2 = uvs[i2 * 2 + 0];\n            const y_uv2 = uvs[i2 * 2 + 1];\n            const x_deltaPos1 = x_v1 - x_v0;\n            const y_deltaPos1 = y_v1 - y_v0;\n            const z_deltaPos1 = z_v1 - z_v0;\n            const x_deltaPos2 = x_v2 - x_v0;\n            const y_deltaPos2 = y_v2 - y_v0;\n            const z_deltaPos2 = z_v2 - z_v0;\n            const x_uvDeltaPos1 = x_uv1 - x_uv0;\n            const y_uvDeltaPos1 = y_uv1 - y_uv0;\n            const x_uvDeltaPos2 = x_uv2 - x_uv0;\n            const y_uvDeltaPos2 = y_uv2 - y_uv0;\n            const rInv = x_uvDeltaPos1 * y_uvDeltaPos2 - y_uvDeltaPos1 * x_uvDeltaPos2;\n            const r = 1.0 / Math.abs(rInv < 0.0001 ? 1.0 : rInv);\n            // Tangent\n            const x_tangent = (x_deltaPos1 * y_uvDeltaPos2 - x_deltaPos2 * y_uvDeltaPos1) * r;\n            const y_tangent = (y_deltaPos1 * y_uvDeltaPos2 - y_deltaPos2 * y_uvDeltaPos1) * r;\n            const z_tangent = (z_deltaPos1 * y_uvDeltaPos2 - z_deltaPos2 * y_uvDeltaPos1) * r;\n            // Bitangent\n            const x_bitangent = (x_deltaPos2 * x_uvDeltaPos1 - x_deltaPos1 * x_uvDeltaPos2) * r;\n            const y_bitangent = (y_deltaPos2 * x_uvDeltaPos1 - y_deltaPos1 * x_uvDeltaPos2) * r;\n            const z_bitangent = (z_deltaPos2 * x_uvDeltaPos1 - z_deltaPos1 * x_uvDeltaPos2) * r;\n            // Gram-Schmidt orthogonalize\n            //t = glm::normalize(t - n * glm:: dot(n, t));\n            const x_n0 = normals[i0 * 3 + 0];\n            const y_n0 = normals[i0 * 3 + 1];\n            const z_n0 = normals[i0 * 3 + 2];\n            const x_n1 = normals[i1 * 3 + 0];\n            const y_n1 = normals[i1 * 3 + 1];\n            const z_n1 = normals[i1 * 3 + 2];\n            const x_n2 = normals[i2 * 3 + 0];\n            const y_n2 = normals[i2 * 3 + 1];\n            const z_n2 = normals[i2 * 3 + 2];\n            // Tangent\n            const n0_dot_t = x_tangent * x_n0 + y_tangent * y_n0 + z_tangent * z_n0;\n            const n1_dot_t = x_tangent * x_n1 + y_tangent * y_n1 + z_tangent * z_n1;\n            const n2_dot_t = x_tangent * x_n2 + y_tangent * y_n2 + z_tangent * z_n2;\n            const x_resTangent0 = x_tangent - x_n0 * n0_dot_t;\n            const y_resTangent0 = y_tangent - y_n0 * n0_dot_t;\n            const z_resTangent0 = z_tangent - z_n0 * n0_dot_t;\n            const x_resTangent1 = x_tangent - x_n1 * n1_dot_t;\n            const y_resTangent1 = y_tangent - y_n1 * n1_dot_t;\n            const z_resTangent1 = z_tangent - z_n1 * n1_dot_t;\n            const x_resTangent2 = x_tangent - x_n2 * n2_dot_t;\n            const y_resTangent2 = y_tangent - y_n2 * n2_dot_t;\n            const z_resTangent2 = z_tangent - z_n2 * n2_dot_t;\n            const magTangent0 = Math.sqrt(x_resTangent0 * x_resTangent0 + y_resTangent0 * y_resTangent0 + z_resTangent0 * z_resTangent0);\n            const magTangent1 = Math.sqrt(x_resTangent1 * x_resTangent1 + y_resTangent1 * y_resTangent1 + z_resTangent1 * z_resTangent1);\n            const magTangent2 = Math.sqrt(x_resTangent2 * x_resTangent2 + y_resTangent2 * y_resTangent2 + z_resTangent2 * z_resTangent2);\n            // Bitangent\n            const n0_dot_bt = x_bitangent * x_n0 + y_bitangent * y_n0 + z_bitangent * z_n0;\n            const n1_dot_bt = x_bitangent * x_n1 + y_bitangent * y_n1 + z_bitangent * z_n1;\n            const n2_dot_bt = x_bitangent * x_n2 + y_bitangent * y_n2 + z_bitangent * z_n2;\n            const x_resBitangent0 = x_bitangent - x_n0 * n0_dot_bt;\n            const y_resBitangent0 = y_bitangent - y_n0 * n0_dot_bt;\n            const z_resBitangent0 = z_bitangent - z_n0 * n0_dot_bt;\n            const x_resBitangent1 = x_bitangent - x_n1 * n1_dot_bt;\n            const y_resBitangent1 = y_bitangent - y_n1 * n1_dot_bt;\n            const z_resBitangent1 = z_bitangent - z_n1 * n1_dot_bt;\n            const x_resBitangent2 = x_bitangent - x_n2 * n2_dot_bt;\n            const y_resBitangent2 = y_bitangent - y_n2 * n2_dot_bt;\n            const z_resBitangent2 = z_bitangent - z_n2 * n2_dot_bt;\n            const magBitangent0 = Math.sqrt(x_resBitangent0 * x_resBitangent0 +\n                y_resBitangent0 * y_resBitangent0 +\n                z_resBitangent0 * z_resBitangent0);\n            const magBitangent1 = Math.sqrt(x_resBitangent1 * x_resBitangent1 +\n                y_resBitangent1 * y_resBitangent1 +\n                z_resBitangent1 * z_resBitangent1);\n            const magBitangent2 = Math.sqrt(x_resBitangent2 * x_resBitangent2 +\n                y_resBitangent2 * y_resBitangent2 +\n                z_resBitangent2 * z_resBitangent2);\n            unpacked.tangents[i0 * 3 + 0] += x_resTangent0 / magTangent0;\n            unpacked.tangents[i0 * 3 + 1] += y_resTangent0 / magTangent0;\n            unpacked.tangents[i0 * 3 + 2] += z_resTangent0 / magTangent0;\n            unpacked.tangents[i1 * 3 + 0] += x_resTangent1 / magTangent1;\n            unpacked.tangents[i1 * 3 + 1] += y_resTangent1 / magTangent1;\n            unpacked.tangents[i1 * 3 + 2] += z_resTangent1 / magTangent1;\n            unpacked.tangents[i2 * 3 + 0] += x_resTangent2 / magTangent2;\n            unpacked.tangents[i2 * 3 + 1] += y_resTangent2 / magTangent2;\n            unpacked.tangents[i2 * 3 + 2] += z_resTangent2 / magTangent2;\n            unpacked.bitangents[i0 * 3 + 0] += x_resBitangent0 / magBitangent0;\n            unpacked.bitangents[i0 * 3 + 1] += y_resBitangent0 / magBitangent0;\n            unpacked.bitangents[i0 * 3 + 2] += z_resBitangent0 / magBitangent0;\n            unpacked.bitangents[i1 * 3 + 0] += x_resBitangent1 / magBitangent1;\n            unpacked.bitangents[i1 * 3 + 1] += y_resBitangent1 / magBitangent1;\n            unpacked.bitangents[i1 * 3 + 2] += z_resBitangent1 / magBitangent1;\n            unpacked.bitangents[i2 * 3 + 0] += x_resBitangent2 / magBitangent2;\n            unpacked.bitangents[i2 * 3 + 1] += y_resBitangent2 / magBitangent2;\n            unpacked.bitangents[i2 * 3 + 2] += z_resBitangent2 / magBitangent2;\n            // TODO: check handedness\n        }\n        this.tangents = unpacked.tangents;\n        this.bitangents = unpacked.bitangents;\n    }\n    /**\n     * @param layout - A {@link Layout} object that describes the\n     * desired memory layout of the generated buffer\n     * @return The packed array in the ... TODO\n     */\n    makeBufferData(layout) {\n        const numItems = this.vertices.length / 3;\n        const buffer = new ArrayBuffer(layout.stride * numItems);\n        buffer.numItems = numItems;\n        const dataView = new DataView(buffer);\n        for (let i = 0, vertexOffset = 0; i < numItems; i++) {\n            vertexOffset = i * layout.stride;\n            // copy in the vertex data in the order and format given by the\n            // layout param\n            for (const attribute of layout.attributes) {\n                const offset = vertexOffset + layout.attributeMap[attribute.key].offset;\n                switch (attribute.key) {\n                    case _layout__WEBPACK_IMPORTED_MODULE_0__["Layout"].POSITION.key:\n                        dataView.setFloat32(offset, this.vertices[i * 3], true);\n                        dataView.setFloat32(offset + 4, this.vertices[i * 3 + 1], true);\n                        dataView.setFloat32(offset + 8, this.vertices[i * 3 + 2], true);\n                        break;\n                    case _layout__WEBPACK_IMPORTED_MODULE_0__["Layout"].UV.key:\n                        dataView.setFloat32(offset, this.textures[i * 2], true);\n                        dataView.setFloat32(offset + 4, this.textures[i * 2 + 1], true);\n                        break;\n                    case _layout__WEBPACK_IMPORTED_MODULE_0__["Layout"].NORMAL.key:\n                        dataView.setFloat32(offset, this.vertexNormals[i * 3], true);\n                        dataView.setFloat32(offset + 4, this.vertexNormals[i * 3 + 1], true);\n                        dataView.setFloat32(offset + 8, this.vertexNormals[i * 3 + 2], true);\n                        break;\n                    case _layout__WEBPACK_IMPORTED_MODULE_0__["Layout"].MATERIAL_INDEX.key:\n                        dataView.setInt16(offset, this.vertexMaterialIndices[i], true);\n                        break;\n                    case _layout__WEBPACK_IMPORTED_MODULE_0__["Layout"].AMBIENT.key: {\n                        const materialIndex = this.vertexMaterialIndices[i];\n                        const material = this.materialsByIndex[materialIndex];\n                        if (!material) {\n                            console.warn(\'Material "\' +\n                                this.materialNames[materialIndex] +\n                                \'" not found in mesh. Did you forget to call addMaterialLibrary(...)?"\');\n                            break;\n                        }\n                        dataView.setFloat32(offset, material.ambient[0], true);\n                        dataView.setFloat32(offset + 4, material.ambient[1], true);\n                        dataView.setFloat32(offset + 8, material.ambient[2], true);\n                        break;\n                    }\n                    case _layout__WEBPACK_IMPORTED_MODULE_0__["Layout"].DIFFUSE.key: {\n                        const materialIndex = this.vertexMaterialIndices[i];\n                        const material = this.materialsByIndex[materialIndex];\n                        if (!material) {\n                            console.warn(\'Material "\' +\n                                this.materialNames[materialIndex] +\n                                \'" not found in mesh. Did you forget to call addMaterialLibrary(...)?"\');\n                            break;\n                        }\n                        dataView.setFloat32(offset, material.diffuse[0], true);\n                        dataView.setFloat32(offset + 4, material.diffuse[1], true);\n                        dataView.setFloat32(offset + 8, material.diffuse[2], true);\n                        break;\n                    }\n                    case _layout__WEBPACK_IMPORTED_MODULE_0__["Layout"].SPECULAR.key: {\n                        const materialIndex = this.vertexMaterialIndices[i];\n                        const material = this.materialsByIndex[materialIndex];\n                        if (!material) {\n                            console.warn(\'Material "\' +\n                                this.materialNames[materialIndex] +\n                                \'" not found in mesh. Did you forget to call addMaterialLibrary(...)?"\');\n                            break;\n                        }\n                        dataView.setFloat32(offset, material.specular[0], true);\n                        dataView.setFloat32(offset + 4, material.specular[1], true);\n                        dataView.setFloat32(offset + 8, material.specular[2], true);\n                        break;\n                    }\n                    case _layout__WEBPACK_IMPORTED_MODULE_0__["Layout"].SPECULAR_EXPONENT.key: {\n                        const materialIndex = this.vertexMaterialIndices[i];\n                        const material = this.materialsByIndex[materialIndex];\n                        if (!material) {\n                            console.warn(\'Material "\' +\n                                this.materialNames[materialIndex] +\n                                \'" not found in mesh. Did you forget to call addMaterialLibrary(...)?"\');\n                            break;\n                        }\n                        dataView.setFloat32(offset, material.specularExponent, true);\n                        break;\n                    }\n                    case _layout__WEBPACK_IMPORTED_MODULE_0__["Layout"].EMISSIVE.key: {\n                        const materialIndex = this.vertexMaterialIndices[i];\n                        const material = this.materialsByIndex[materialIndex];\n                        if (!material) {\n                            console.warn(\'Material "\' +\n                                this.materialNames[materialIndex] +\n                                \'" not found in mesh. Did you forget to call addMaterialLibrary(...)?"\');\n                            break;\n                        }\n                        dataView.setFloat32(offset, material.emissive[0], true);\n                        dataView.setFloat32(offset + 4, material.emissive[1], true);\n                        dataView.setFloat32(offset + 8, material.emissive[2], true);\n                        break;\n                    }\n                    case _layout__WEBPACK_IMPORTED_MODULE_0__["Layout"].TRANSMISSION_FILTER.key: {\n                        const materialIndex = this.vertexMaterialIndices[i];\n                        const material = this.materialsByIndex[materialIndex];\n                        if (!material) {\n                            console.warn(\'Material "\' +\n                                this.materialNames[materialIndex] +\n                                \'" not found in mesh. Did you forget to call addMaterialLibrary(...)?"\');\n                            break;\n                        }\n                        dataView.setFloat32(offset, material.transmissionFilter[0], true);\n                        dataView.setFloat32(offset + 4, material.transmissionFilter[1], true);\n                        dataView.setFloat32(offset + 8, material.transmissionFilter[2], true);\n                        break;\n                    }\n                    case _layout__WEBPACK_IMPORTED_MODULE_0__["Layout"].DISSOLVE.key: {\n                        const materialIndex = this.vertexMaterialIndices[i];\n                        const material = this.materialsByIndex[materialIndex];\n                        if (!material) {\n                            console.warn(\'Material "\' +\n                                this.materialNames[materialIndex] +\n                                \'" not found in mesh. Did you forget to call addMaterialLibrary(...)?"\');\n                            break;\n                        }\n                        dataView.setFloat32(offset, material.dissolve, true);\n                        break;\n                    }\n                    case _layout__WEBPACK_IMPORTED_MODULE_0__["Layout"].ILLUMINATION.key: {\n                        const materialIndex = this.vertexMaterialIndices[i];\n                        const material = this.materialsByIndex[materialIndex];\n                        if (!material) {\n                            console.warn(\'Material "\' +\n                                this.materialNames[materialIndex] +\n                                \'" not found in mesh. Did you forget to call addMaterialLibrary(...)?"\');\n                            break;\n                        }\n                        dataView.setInt16(offset, material.illumination, true);\n                        break;\n                    }\n                    case _layout__WEBPACK_IMPORTED_MODULE_0__["Layout"].REFRACTION_INDEX.key: {\n                        const materialIndex = this.vertexMaterialIndices[i];\n                        const material = this.materialsByIndex[materialIndex];\n                        if (!material) {\n                            console.warn(\'Material "\' +\n                                this.materialNames[materialIndex] +\n                                \'" not found in mesh. Did you forget to call addMaterialLibrary(...)?"\');\n                            break;\n                        }\n                        dataView.setFloat32(offset, material.refractionIndex, true);\n                        break;\n                    }\n                    case _layout__WEBPACK_IMPORTED_MODULE_0__["Layout"].SHARPNESS.key: {\n                        const materialIndex = this.vertexMaterialIndices[i];\n                        const material = this.materialsByIndex[materialIndex];\n                        if (!material) {\n                            console.warn(\'Material "\' +\n                                this.materialNames[materialIndex] +\n                                \'" not found in mesh. Did you forget to call addMaterialLibrary(...)?"\');\n                            break;\n                        }\n                        dataView.setFloat32(offset, material.sharpness, true);\n                        break;\n                    }\n                    case _layout__WEBPACK_IMPORTED_MODULE_0__["Layout"].ANTI_ALIASING.key: {\n                        const materialIndex = this.vertexMaterialIndices[i];\n                        const material = this.materialsByIndex[materialIndex];\n                        if (!material) {\n                            console.warn(\'Material "\' +\n                                this.materialNames[materialIndex] +\n                                \'" not found in mesh. Did you forget to call addMaterialLibrary(...)?"\');\n                            break;\n                        }\n                        dataView.setInt16(offset, material.antiAliasing ? 1 : 0, true);\n                        break;\n                    }\n                }\n            }\n        }\n        return buffer;\n    }\n    makeIndexBufferData() {\n        const buffer = new Uint16Array(this.indices);\n        buffer.numItems = this.indices.length;\n        return buffer;\n    }\n    makeIndexBufferDataForMaterials(...materialIndices) {\n        const indices = new Array().concat(...materialIndices.map(mtlIdx => this.indicesPerMaterial[mtlIdx]));\n        const buffer = new Uint16Array(indices);\n        buffer.numItems = indices.length;\n        return buffer;\n    }\n    addMaterialLibrary(mtl) {\n        for (const name in mtl.materials) {\n            if (!(name in this.materialIndices)) {\n                // This material is not referenced by the mesh\n                continue;\n            }\n            const material = mtl.materials[name];\n            // Find the material index for this material\n            const materialIndex = this.materialIndices[material.name];\n            // Put the material into the materialsByIndex object at the right\n            // spot as determined when the obj file was parsed\n            this.materialsByIndex[materialIndex] = material;\n        }\n    }\n}\nfunction* triangulate(elements) {\n    if (elements.length <= 3) {\n        yield elements;\n    }\n    else if (elements.length === 4) {\n        yield [elements[0], elements[1], elements[2]];\n        yield [elements[2], elements[3], elements[0]];\n    }\n    else {\n        for (let i = 1; i < elements.length - 1; i++) {\n            yield [elements[0], elements[i], elements[i + 1]];\n        }\n    }\n}\n\n\n//# sourceURL=webpack://OBJ/./src/mesh.ts?')},"./src/utils.ts":
/*!**********************!*\
  !*** ./src/utils.ts ***!
  \**********************/
/*! exports provided: downloadModels, downloadMeshes, initMeshBuffers, deleteMeshBuffers */function(module,__webpack_exports__,__webpack_require__){"use strict";eval('__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "downloadModels", function() { return downloadModels; });\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "downloadMeshes", function() { return downloadMeshes; });\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "initMeshBuffers", function() { return initMeshBuffers; });\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "deleteMeshBuffers", function() { return deleteMeshBuffers; });\n/* harmony import */ var _mesh__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./mesh */ "./src/mesh.ts");\n/* harmony import */ var _material__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./material */ "./src/material.ts");\n\n\nfunction downloadMtlTextures(mtl, root) {\n    const mapAttributes = [\n        "mapDiffuse",\n        "mapAmbient",\n        "mapSpecular",\n        "mapDissolve",\n        "mapBump",\n        "mapDisplacement",\n        "mapDecal",\n        "mapEmissive",\n    ];\n    if (!root.endsWith("/")) {\n        root += "/";\n    }\n    const textures = [];\n    for (const materialName in mtl.materials) {\n        if (!mtl.materials.hasOwnProperty(materialName)) {\n            continue;\n        }\n        const material = mtl.materials[materialName];\n        for (const attr of mapAttributes) {\n            const mapData = material[attr];\n            if (!mapData || !mapData.filename) {\n                continue;\n            }\n            const url = root + mapData.filename;\n            textures.push(fetch(url)\n                .then(response => {\n                if (!response.ok) {\n                    throw new Error();\n                }\n                return response.blob();\n            })\n                .then(function (data) {\n                const image = new Image();\n                image.src = URL.createObjectURL(data);\n                mapData.texture = image;\n                return new Promise(resolve => (image.onload = resolve));\n            })\n                .catch(() => {\n                console.error(`Unable to download texture: ${url}`);\n            }));\n        }\n    }\n    return Promise.all(textures);\n}\nfunction getMtl(modelOptions) {\n    if (!(typeof modelOptions.mtl === "string")) {\n        return modelOptions.obj.replace(/\\.obj$/, ".mtl");\n    }\n    return modelOptions.mtl;\n}\n/**\n * Accepts a list of model request objects and returns a Promise that\n * resolves when all models have been downloaded and parsed.\n *\n * The list of model objects follow this interface:\n * {\n *  obj: \'path/to/model.obj\',\n *  mtl: true | \'path/to/model.mtl\',\n *  downloadMtlTextures: true | false\n *  mtlTextureRoot: \'/models/suzanne/maps\'\n *  name: \'suzanne\'\n * }\n *\n * The `obj` attribute is required and should be the path to the\n * model\'s .obj file relative to the current repo (absolute URLs are\n * suggested).\n *\n * The `mtl` attribute is optional and can either be a boolean or\n * a path to the model\'s .mtl file relative to the current URL. If\n * the value is `true`, then the path and basename given for the `obj`\n * attribute is used replacing the .obj suffix for .mtl\n * E.g.: {obj: \'models/foo.obj\', mtl: true} would search for \'models/foo.mtl\'\n *\n * The `name` attribute is optional and is a human friendly name to be\n * included with the parsed OBJ and MTL files. If not given, the base .obj\n * filename will be used.\n *\n * The `downloadMtlTextures` attribute is a flag for automatically downloading\n * any images found in the MTL file and attaching them to each Material\n * created from that file. For example, if material.mapDiffuse is set (there\n * was data in the MTL file), then material.mapDiffuse.texture will contain\n * the downloaded image. This option defaults to `true`. By default, the MTL\'s\n * URL will be used to determine the location of the images.\n *\n * The `mtlTextureRoot` attribute is optional and should point to the location\n * on the server that this MTL\'s texture files are located. The default is to\n * use the MTL file\'s location.\n *\n * @returns {Promise} the result of downloading the given list of models. The\n * promise will resolve with an object whose keys are the names of the models\n * and the value is its Mesh object. Each Mesh object will automatically\n * have its addMaterialLibrary() method called to set the given MTL data (if given).\n */\nfunction downloadModels(models) {\n    const finished = [];\n    for (const model of models) {\n        if (!model.obj) {\n            throw new Error(\'"obj" attribute of model object not set. The .obj file is required to be set \' +\n                "in order to use downloadModels()");\n        }\n        const options = {\n            indicesPerMaterial: !!model.indicesPerMaterial,\n            calcTangentsAndBitangents: !!model.calcTangentsAndBitangents,\n        };\n        // if the name is not provided, dervive it from the given OBJ\n        let name = model.name;\n        if (!name) {\n            const parts = model.obj.split("/");\n            name = parts[parts.length - 1].replace(".obj", "");\n        }\n        const namePromise = Promise.resolve(name);\n        const meshPromise = fetch(model.obj)\n            .then(response => response.text())\n            .then(data => {\n            return new _mesh__WEBPACK_IMPORTED_MODULE_0__["default"](data, options);\n        });\n        let mtlPromise;\n        // Download MaterialLibrary file?\n        if (model.mtl) {\n            const mtl = getMtl(model);\n            mtlPromise = fetch(mtl)\n                .then(response => response.text())\n                .then((data) => {\n                const material = new _material__WEBPACK_IMPORTED_MODULE_1__["MaterialLibrary"](data);\n                if (model.downloadMtlTextures !== false) {\n                    let root = model.mtlTextureRoot;\n                    if (!root) {\n                        // get the directory of the MTL file as default\n                        root = mtl.substr(0, mtl.lastIndexOf("/"));\n                    }\n                    // downloadMtlTextures returns a Promise that\n                    // is resolved once all of the images it\n                    // contains are downloaded. These are then\n                    // attached to the map data objects\n                    return Promise.all([Promise.resolve(material), downloadMtlTextures(material, root)]);\n                }\n                return Promise.all([Promise.resolve(material), undefined]);\n            })\n                .then((value) => {\n                return value[0];\n            });\n        }\n        const parsed = [namePromise, meshPromise, mtlPromise];\n        finished.push(Promise.all(parsed));\n    }\n    return Promise.all(finished).then(ms => {\n        // the "finished" promise is a list of name, Mesh instance,\n        // and MaterialLibary instance. This unpacks and returns an\n        // object mapping name to Mesh (Mesh points to MTL).\n        const models = {};\n        for (const model of ms) {\n            const [name, mesh, mtl] = model;\n            mesh.name = name;\n            if (mtl) {\n                mesh.addMaterialLibrary(mtl);\n            }\n            models[name] = mesh;\n        }\n        return models;\n    });\n}\n/**\n * Takes in an object of `mesh_name`, `\'/url/to/OBJ/file\'` pairs and a callback\n * function. Each OBJ file will be ajaxed in and automatically converted to\n * an OBJ.Mesh. When all files have successfully downloaded the callback\n * function provided will be called and passed in an object containing\n * the newly created meshes.\n *\n * **Note:** In order to use this function as a way to download meshes, a\n * webserver of some sort must be used.\n *\n * @param {Object} nameAndAttrs an object where the key is the name of the mesh and the value is the url to that mesh\'s OBJ file\n *\n * @param {Function} completionCallback should contain a function that will take one parameter: an object array where the keys will be the unique object name and the value will be a Mesh object\n *\n * @param {Object} meshes In case other meshes are loaded separately or if a previously declared variable is desired to be used, pass in a (possibly empty) json object of the pattern: { \'<mesh_name>\': OBJ.Mesh }\n *\n */\nfunction downloadMeshes(nameAndURLs, completionCallback, meshes) {\n    if (meshes === undefined) {\n        meshes = {};\n    }\n    const completed = [];\n    for (const mesh_name in nameAndURLs) {\n        if (!nameAndURLs.hasOwnProperty(mesh_name)) {\n            continue;\n        }\n        const url = nameAndURLs[mesh_name];\n        completed.push(fetch(url)\n            .then(response => response.text())\n            .then(data => {\n            return [mesh_name, new _mesh__WEBPACK_IMPORTED_MODULE_0__["default"](data)];\n        }));\n    }\n    Promise.all(completed).then(ms => {\n        for (const [name, mesh] of ms) {\n            meshes[name] = mesh;\n        }\n        return completionCallback(meshes);\n    });\n}\nfunction _buildBuffer(gl, type, data, itemSize) {\n    const buffer = gl.createBuffer();\n    const arrayView = type === gl.ARRAY_BUFFER ? Float32Array : Uint16Array;\n    gl.bindBuffer(type, buffer);\n    gl.bufferData(type, new arrayView(data), gl.STATIC_DRAW);\n    buffer.itemSize = itemSize;\n    buffer.numItems = data.length / itemSize;\n    return buffer;\n}\n/**\n * Takes in the WebGL context and a Mesh, then creates and appends the buffers\n * to the mesh object as attributes.\n *\n * @param {WebGLRenderingContext} gl the `canvas.getContext(\'webgl\')` context instance\n * @param {Mesh} mesh a single `OBJ.Mesh` instance\n *\n * The newly created mesh attributes are:\n *\n * Attrbute | Description\n * :--- | ---\n * **normalBuffer**       |contains the model&#39;s Vertex Normals\n * normalBuffer.itemSize  |set to 3 items\n * normalBuffer.numItems  |the total number of vertex normals\n * |\n * **textureBuffer**      |contains the model&#39;s Texture Coordinates\n * textureBuffer.itemSize |set to 2 items\n * textureBuffer.numItems |the number of texture coordinates\n * |\n * **vertexBuffer**       |contains the model&#39;s Vertex Position Coordinates (does not include w)\n * vertexBuffer.itemSize  |set to 3 items\n * vertexBuffer.numItems  |the total number of vertices\n * |\n * **indexBuffer**        |contains the indices of the faces\n * indexBuffer.itemSize   |is set to 1\n * indexBuffer.numItems   |the total number of indices\n *\n * A simple example (a lot of steps are missing, so don\'t copy and paste):\n *\n *     const gl   = canvas.getContext(\'webgl\'),\n *         mesh = OBJ.Mesh(obj_file_data);\n *     // compile the shaders and create a shader program\n *     const shaderProgram = gl.createProgram();\n *     // compilation stuff here\n *     ...\n *     // make sure you have vertex, vertex normal, and texture coordinate\n *     // attributes located in your shaders and attach them to the shader program\n *     shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");\n *     gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);\n *\n *     shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");\n *     gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);\n *\n *     shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");\n *     gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);\n *\n *     // create and initialize the vertex, vertex normal, and texture coordinate buffers\n *     // and save on to the mesh object\n *     OBJ.initMeshBuffers(gl, mesh);\n *\n *     // now to render the mesh\n *     gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexBuffer);\n *     gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, mesh.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);\n *     // it\'s possible that the mesh doesn\'t contain\n *     // any texture coordinates (e.g. suzanne.obj in the development branch).\n *     // in this case, the texture vertexAttribArray will need to be disabled\n *     // before the call to drawElements\n *     if(!mesh.textures.length){\n *       gl.disableVertexAttribArray(shaderProgram.textureCoordAttribute);\n *     }\n *     else{\n *       // if the texture vertexAttribArray has been previously\n *       // disabled, then it needs to be re-enabled\n *       gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);\n *       gl.bindBuffer(gl.ARRAY_BUFFER, mesh.textureBuffer);\n *       gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, mesh.textureBuffer.itemSize, gl.FLOAT, false, 0, 0);\n *     }\n *\n *     gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normalBuffer);\n *     gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, mesh.normalBuffer.itemSize, gl.FLOAT, false, 0, 0);\n *\n *     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.mesh.indexBuffer);\n *     gl.drawElements(gl.TRIANGLES, model.mesh.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);\n */\nfunction initMeshBuffers(gl, mesh) {\n    mesh.normalBuffer = _buildBuffer(gl, gl.ARRAY_BUFFER, mesh.vertexNormals, 3);\n    mesh.textureBuffer = _buildBuffer(gl, gl.ARRAY_BUFFER, mesh.textures, mesh.textureStride);\n    mesh.vertexBuffer = _buildBuffer(gl, gl.ARRAY_BUFFER, mesh.vertices, 3);\n    mesh.indexBuffer = _buildBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, mesh.indices, 1);\n    return mesh;\n}\nfunction deleteMeshBuffers(gl, mesh) {\n    gl.deleteBuffer(mesh.normalBuffer);\n    gl.deleteBuffer(mesh.textureBuffer);\n    gl.deleteBuffer(mesh.vertexBuffer);\n    gl.deleteBuffer(mesh.indexBuffer);\n}\n\n\n//# sourceURL=webpack://OBJ/./src/utils.ts?')},0:
/*!****************************!*\
  !*** multi ./src/index.ts ***!
  \****************************/
/*! no static exports found */function(module,exports,__webpack_require__){eval('module.exports = __webpack_require__(/*! /home/aaron/google_drive/projects/webgl-obj-loader/src/index.ts */"./src/index.ts");\n\n\n//# sourceURL=webpack://OBJ/multi_./src/index.ts?')}})}));
},{}],14:[function(require,module,exports){
module.exports = function parse(params){
      var template = "precision mediump float; \n" +" \n" +
" \n" +" \n" +
"varying vec2 vTextureCoord; \n" +" \n" +
"varying vec3 vTransformedNormal; \n" +" \n" +
"varying vec4 vPosition; \n" +" \n" +
" \n" +" \n" +
"void main() { \n" +" \n" +
"  gl_FragColor = vec4(1, 0, 0.5, 1); // return reddish-purple \n" +" \n" +
"} \n" 
      params = params || {}
      for(var key in params) {
        var matcher = new RegExp("{{"+key+"}}","g")
        template = template.replace(matcher, params[key])
      }
      return template
    };

},{}],15:[function(require,module,exports){
module.exports = function parse(params){
      var template = "attribute vec3 aVertexPosition; \n" +" \n" +
"attribute vec3 aVertexNormal; \n" +" \n" +
"attribute vec2 aTextureCoord; \n" +" \n" +
" \n" +" \n" +
"uniform mat4 uMVMatrix; \n" +" \n" +
"uniform mat4 uPMatrix; \n" +" \n" +
"uniform mat3 uNMatrix; \n" +" \n" +
" \n" +" \n" +
"varying vec2 vTextureCoord; \n" +" \n" +
"varying vec3 vTransformedNormal; \n" +" \n" +
"varying vec4 vPosition; \n" +" \n" +
" \n" +" \n" +
"void main(void) { \n" +" \n" +
"    vPosition = uMVMatrix * vec4(aVertexPosition, 1.0); \n" +" \n" +
"    gl_Position = uPMatrix * vPosition; \n" +" \n" +
"    vTextureCoord = aTextureCoord; \n" +" \n" +
"    vTransformedNormal = uNMatrix * aVertexNormal; \n" +" \n" +
"} \n" +" \n" +
" \n" 
      params = params || {}
      for(var key in params) {
        var matcher = new RegExp("{{"+key+"}}","g")
        template = template.replace(matcher, params[key])
      }
      return template
    };

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9nbC1tYXRyaXgvY2pzL2NvbW1vbi5qcyIsIm5vZGVfbW9kdWxlcy9nbC1tYXRyaXgvY2pzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2dsLW1hdHJpeC9janMvbWF0Mi5qcyIsIm5vZGVfbW9kdWxlcy9nbC1tYXRyaXgvY2pzL21hdDJkLmpzIiwibm9kZV9tb2R1bGVzL2dsLW1hdHJpeC9janMvbWF0My5qcyIsIm5vZGVfbW9kdWxlcy9nbC1tYXRyaXgvY2pzL21hdDQuanMiLCJub2RlX21vZHVsZXMvZ2wtbWF0cml4L2Nqcy9xdWF0LmpzIiwibm9kZV9tb2R1bGVzL2dsLW1hdHJpeC9janMvcXVhdDIuanMiLCJub2RlX21vZHVsZXMvZ2wtbWF0cml4L2Nqcy92ZWMyLmpzIiwibm9kZV9tb2R1bGVzL2dsLW1hdHJpeC9janMvdmVjMy5qcyIsIm5vZGVfbW9kdWxlcy9nbC1tYXRyaXgvY2pzL3ZlYzQuanMiLCJub2RlX21vZHVsZXMvd2ViZ2wtb2JqLWxvYWRlci9kaXN0L3dlYmdsLW9iai1sb2FkZXIubWluLmpzIiwic2hhZGVyL2ZyYWdtZW50LmMiLCJzaGFkZXIvdmVydGV4LmMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDck1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzllQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsaUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3AxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5M0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdHhCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNodEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDejNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy91QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJ2YXIgZ2xtYXRyaXggPSByZXF1aXJlKCdnbC1tYXRyaXgnKTtcclxudmFyIHN2cyAgPSByZXF1aXJlKCcuL3NoYWRlci92ZXJ0ZXguYycpO1xyXG52YXIgc2ZzICA9IHJlcXVpcmUoJy4vc2hhZGVyL2ZyYWdtZW50LmMnKTtcclxudmFyIE9CSiA9IHJlcXVpcmUoJ3dlYmdsLW9iai1sb2FkZXInKTtcclxuXHJcbnZhciBhcHAgPSB7fTtcclxuYXBwLm1lc2hlcyA9IHt9O1xyXG5hcHAubW9kZWxzID0ge307XHJcbmFwcC5tdk1hdHJpeCA9IGdsbWF0cml4Lm1hdDQuY3JlYXRlKCk7XHJcbmFwcC5tdk1hdHJpeFN0YWNrID0gW107XHJcbmFwcC5wTWF0cml4ID0gZ2xtYXRyaXgubWF0NC5jcmVhdGUoKTtcclxuXHJcbi8vIGNvbnN0IHsgbWF0NCwgbWF0MywgdmVjMyB9ID0gZ2xNYXRyaXg7XHJcblxyXG5jb25zdCBjcmVhdGVNZXNoZXMgPSAoKSA9PiB7XHJcbiAgICB2YXIgb2JqU3RyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ215X2N1YmUub2JqJykuaW5uZXJIVE1MO1xyXG4gICAgdmFyIG5ld01lc2ggPSBuZXcgT0JKLk1lc2gob2JqU3RyKTtcclxuICAgIHZhciBtZXNoZXMgPSB7IG15X2N1YmU6IG5ld01lc2ggfTtcclxuICAgIGFwcC5tZXNoZXMgPSBtZXNoZXM7XHJcbn1cclxuXHJcbndpbmRvdy5vbmxvYWQgPSAoKSA9PiB7XHJcbiAgICBjcmVhdGVNZXNoZXMoKTtcclxuICAgIHdlYkdMSW5pdGlhbGl6ZSgpLnRoZW4oIChwcm9ncmFtQ29udGV4dCkgPT4ge1xyXG4gICAgICAgIGluaXRTaGFkZXJzQW5kQnVmZmVycyhwcm9ncmFtQ29udGV4dCk7XHJcbiAgICAgICAgZHJhd1NjZW5lKHByb2dyYW1Db250ZXh0KTtcclxuICAgIH0pO1xyXG59XHJcblxyXG4vLyBHZXQgQSBXZWJHTCBjb250ZXh0XHJcbmNvbnN0IGdldENhbnZhcyA9IChwYXJlbnQpID0+IHtcclxuICAgIHZhciBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcclxuICAgIGNhbnZhcy5zZXRBdHRyaWJ1dGUoJ2lkJywgJ2dsY2FudmFzJyk7XHJcbiAgICBjYW52YXMuc2V0QXR0cmlidXRlKCd3aWR0aCcsICc0MDAnKTtcclxuICAgIGNhbnZhcy5zZXRBdHRyaWJ1dGUoJ2hlaWdodCcsICc0MDAnKTtcclxuICAgIHBhcmVudC5hcHBlbmRDaGlsZChjYW52YXMpO1xyXG4gICAgXHJcbiAgICB2YXIgZ2wgPSBjYW52YXMuZ2V0Q29udGV4dCgnd2ViZ2wnKTtcclxuICAgIHJldHVybiB7IGNhbnZhczogY2FudmFzLCBnbCA6IGdsIH1cclxufTtcclxuXHJcbi8vIEluaXRpYWxpemUgV2ViR0wgY29udGV4dCB3aXRoIHNoYWRlcnNcclxuY29uc3Qgd2ViR0xJbml0aWFsaXplID0gKCkgPT4ge1xyXG5cclxuICAgIC8vIEdldCByZWZlcmVuY2UgdG8gY2FudmFzXHJcbiAgICB2YXIgYm9keSA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdib2R5JylbMF07XHJcbiAgICB2YXIgZ2xjb250ZXh0ID0gZ2V0Q2FudmFzKGJvZHkpO1xyXG4gICAgdmFyIGdsID0gZ2xjb250ZXh0LmdsO1xyXG5cclxuICAgIC8vIENyZWF0ZSB2ZXJ0ZXggYW5kIGZyYWdtZW50IHNoYWRlcnNcclxuICAgIHZhciB2ZXJ0ZXhTaGFkZXIgPSBnbC5jcmVhdGVTaGFkZXIoZ2wuVkVSVEVYX1NIQURFUik7XHJcbiAgICBnbC5zaGFkZXJTb3VyY2UodmVydGV4U2hhZGVyLCBzdnMoKSk7XHJcbiAgICBnbC5jb21waWxlU2hhZGVyKHZlcnRleFNoYWRlcik7XHJcbiAgICBcclxuICAgIHZhciBmcmFnbWVudFNoYWRlciA9IGdsLmNyZWF0ZVNoYWRlcihnbC5GUkFHTUVOVF9TSEFERVIpO1xyXG4gICAgZ2wuc2hhZGVyU291cmNlKGZyYWdtZW50U2hhZGVyLCBzZnMoKSk7XHJcbiAgICBnbC5jb21waWxlU2hhZGVyKGZyYWdtZW50U2hhZGVyKTtcclxuXHJcbiAgICB2YXIgc3VjY2VzcyA9IGdsLmdldFNoYWRlclBhcmFtZXRlcihmcmFnbWVudFNoYWRlciwgZ2wuQ09NUElMRV9TVEFUVVMpO1xyXG4gICAgaWYgKHN1Y2Nlc3MpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIlNoYWRlciBzdWNjZXNzZnVsbHkgY29tcGlsZWRcIik7XHJcbiAgICAgICAgY29uc29sZS5sb2coZ2wuZ2V0U2hhZGVySW5mb0xvZyhmcmFnbWVudFNoYWRlcikpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIlNoYWRlciBub3QgY29tcGlsZWQuLi5cIilcclxuICAgIH1cclxuICAgIFxyXG4gICAgLy8gTGluayBzaGFkZXJzIHRvIGNyZWF0ZWQgZ2wgcHJvZ3JhbVxyXG4gICAgdmFyIHNoYWRlcnMgPSBbdmVydGV4U2hhZGVyLCBmcmFnbWVudFNoYWRlcl07XHJcbiAgICB2YXIgcHJvZ3JhbSA9IGdsLmNyZWF0ZVByb2dyYW0oKTtcclxuICAgIHNoYWRlcnMuZm9yRWFjaCggKHNoYWRlcikgPT4ge1xyXG4gICAgICAgIGdsLmF0dGFjaFNoYWRlcihwcm9ncmFtLCBzaGFkZXIpO1xyXG4gICAgfSk7XHJcbiAgICBnbC5saW5rUHJvZ3JhbShwcm9ncmFtKTtcclxuICAgIHZhciBzdWNjZXNzID0gZ2wuZ2V0UHJvZ3JhbVBhcmFtZXRlcihwcm9ncmFtLCBnbC5MSU5LX1NUQVRVUyk7XHJcbiAgICBpZiAoc3VjY2Vzcykge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiU3VjY2Vzc2Z1bGx5IGxpbmtlZC5cIik7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiBuZXcgUHJvbWlzZSAoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgIGlmICghZ2wpIHJldHVybiByZWplY3QoXCJXZWJHTCBpbml0aWFsaXphdGlvbiBmYWlsZWQuXCIpO1xyXG4gICAgICAgIHJlc29sdmUoeyBcclxuICAgICAgICAgICAgZ2w6IGdsLFxyXG4gICAgICAgICAgICBwcm9ncmFtOiBwcm9ncmFtXHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxufVxyXG5cclxuY29uc3Qgc2V0TWF0cml4VW5pZm9ybXMgPSAocHJvZ3JhbUNvbnRleHQpID0+IHtcclxuXHJcbiAgICB2YXIgZ2wgPSBwcm9ncmFtQ29udGV4dC5nbDtcclxuICAgIHZhciBwcm9ncmFtID0gcHJvZ3JhbUNvbnRleHQucHJvZ3JhbTtcclxuXHJcbiAgICBnbC51bmlmb3JtTWF0cml4NGZ2KHByb2dyYW0ucE1hdHJpeFVuaWZvcm0sIGZhbHNlLCBhcHAucE1hdHJpeCk7XHJcbiAgICBnbC51bmlmb3JtTWF0cml4NGZ2KHByb2dyYW0ubXZNYXRyaXhVbmlmb3JtLCBmYWxzZSwgYXBwLm12TWF0cml4KTtcclxuXHJcbiAgICAvLyBUbyB0cmFuc2Zvcm0gbm9ybWFscywgd2UgbmVlZCB0byBmaW5kIHRoZSB0cmFuc3Bvc2Ugb2ZcclxuICAgIC8vIHRoZSBpbnZlcnNlIG9mIHRoZSBNb2RlbFZpZXcgbWF0cml4XHJcbiAgICB2YXIgbm9ybWFsTWF0cml4ID0gZ2xtYXRyaXgubWF0My5jcmVhdGUoKTtcclxuICAgIHZhciBtdk1hdHJpeE1hdDMgPSBnbG1hdHJpeC5tYXQzLmNyZWF0ZSgpO1xyXG4gICAgZ2xtYXRyaXgubWF0My5mcm9tTWF0NChtdk1hdHJpeE1hdDMsIGFwcC5tdk1hdHJpeCk7XHJcbiAgICBnbG1hdHJpeC5tYXQzLmludmVydChub3JtYWxNYXRyaXgsIG12TWF0cml4TWF0Myk7XHJcbiAgICBnbG1hdHJpeC5tYXQzLnRyYW5zcG9zZShub3JtYWxNYXRyaXgsIG5vcm1hbE1hdHJpeCk7XHJcbiAgICBcclxuICAgIC8vIGdsbWF0cml4Lm1hdDQudG9JbnZlcnNlTWF0MyhhcHAubXZNYXRyaXgsIG5vcm1hbE1hdHJpeCk7XHJcbiAgICBnbC51bmlmb3JtTWF0cml4M2Z2KHByb2dyYW0ubk1hdHJpeFVuaWZvcm0sIGZhbHNlLCBub3JtYWxNYXRyaXgpO1xyXG59XHJcblxyXG5jb25zdCBpbml0U2hhZGVyc0FuZEJ1ZmZlcnMgPSAocHJvZ3JhbUNvbnRleHQpID0+IHtcclxuXHJcbiAgICB2YXIgZ2wgPSBwcm9ncmFtQ29udGV4dC5nbDtcclxuICAgIHZhciBwcm9ncmFtID0gcHJvZ3JhbUNvbnRleHQucHJvZ3JhbTtcclxuXHJcbiAgICBjb25zb2xlLmxvZyhnbCk7XHJcbiAgICBnbC51c2VQcm9ncmFtKHByb2dyYW0pO1xyXG5cclxuICAgIC8vIEF0dGFjaCBhdHRyaWJ1dGVzIHRvIHRoZSBzaGFkZXIgcHJvZ3JhbVxyXG4gICAgcHJvZ3JhbS52ZXJ0ZXhQb3NpdGlvbkF0dHJpYnV0ZSA9IGdsLmdldEF0dHJpYkxvY2F0aW9uKHByb2dyYW0sIFwiYVZlcnRleFBvc2l0aW9uXCIpO1xyXG4gICAgZ2wuZW5hYmxlVmVydGV4QXR0cmliQXJyYXkocHJvZ3JhbS52ZXJ0ZXhQb3NpdGlvbkF0dHJpYnV0ZSk7XHJcbiAgICBcclxuICAgIHByb2dyYW0udmVydGV4Tm9ybWFsQXR0cmlidXRlID0gZ2wuZ2V0QXR0cmliTG9jYXRpb24ocHJvZ3JhbSwgXCJhVmVydGV4Tm9ybWFsXCIpO1xyXG4gICAgZ2wuZW5hYmxlVmVydGV4QXR0cmliQXJyYXkocHJvZ3JhbS52ZXJ0ZXhOb3JtYWxBdHRyaWJ1dGUpO1xyXG4gICAgXHJcbiAgICBwcm9ncmFtLnRleHR1cmVDb29yZEF0dHJpYnV0ZSA9IGdsLmdldEF0dHJpYkxvY2F0aW9uKHByb2dyYW0sIFwiYVRleHR1cmVDb29yZFwiKTtcclxuICAgIGdsLmVuYWJsZVZlcnRleEF0dHJpYkFycmF5KHByb2dyYW0udGV4dHVyZUNvb3JkQXR0cmlidXRlKTtcclxuXHJcbiAgICBwcm9ncmFtLnBNYXRyaXhVbmlmb3JtID0gZ2wuZ2V0VW5pZm9ybUxvY2F0aW9uKHByb2dyYW0sIFwidVBNYXRyaXhcIik7XHJcbiAgICBwcm9ncmFtLm12TWF0cml4VW5pZm9ybSA9IGdsLmdldFVuaWZvcm1Mb2NhdGlvbihwcm9ncmFtLCBcInVNVk1hdHJpeFwiKTtcclxuICAgIHByb2dyYW0ubk1hdHJpeFVuaWZvcm0gPSBnbC5nZXRVbmlmb3JtTG9jYXRpb24ocHJvZ3JhbSwgXCJ1Tk1hdHJpeFwiKTtcclxuICAgIFxyXG4gICAgZm9yICh2YXIgbWVzaCBpbiBhcHAubWVzaGVzKSB7XHJcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgVkJPc1xyXG4gICAgICAgIE9CSi5pbml0TWVzaEJ1ZmZlcnMoZ2wsIGFwcC5tZXNoZXNbbWVzaF0pO1xyXG4gICAgICAgIGFwcC5tb2RlbHNbbWVzaF0gPSB7fTtcclxuICAgICAgICBhcHAubW9kZWxzW21lc2hdLm1lc2ggPSBhcHAubWVzaGVzW21lc2hdO1xyXG4gICAgfVxyXG59XHJcblxyXG5jb25zdCBkcmF3T2JqZWN0ID0gKHByb2dyYW1Db250ZXh0LCBtb2RlbCkgPT4ge1xyXG5cclxuICAgIHZhciBnbCA9IHByb2dyYW1Db250ZXh0LmdsO1xyXG4gICAgdmFyIHByb2dyYW0gPSBwcm9ncmFtQ29udGV4dC5wcm9ncmFtO1xyXG5cclxuICAgIGNvbnNvbGUubG9nKG1vZGVsKTtcclxuICAgIGNvbnNvbGUubG9nKG1vZGVsLm1lc2gudmVydGV4QnVmZmVyLml0ZW1TaXplKTtcclxuICAgIGNvbnNvbGUubG9nKG1vZGVsLm1lc2gubm9ybWFsQnVmZmVyLml0ZW1TaXplKTtcclxuICAgIGNvbnNvbGUubG9nKG1vZGVsLm1lc2gudGV4dHVyZUJ1ZmZlci5pdGVtU2l6ZSk7XHJcblxyXG4gICAgLy8gQmluZCBidWZmZXJzXHJcbiAgICBnbC5iaW5kQnVmZmVyKGdsLkFSUkFZX0JVRkZFUiwgbW9kZWwubWVzaC52ZXJ0ZXhCdWZmZXIpO1xyXG4gICAgZ2wudmVydGV4QXR0cmliUG9pbnRlcihwcm9ncmFtLnZlcnRleFBvc2l0aW9uQXR0cmlidXRlLCBtb2RlbC5tZXNoLnZlcnRleEJ1ZmZlci5pdGVtU2l6ZSwgZ2wuRkxPQVQsIGZhbHNlLCAwLCAwKTtcclxuICAgIFxyXG4gICAgZ2wuYmluZEJ1ZmZlcihnbC5BUlJBWV9CVUZGRVIsIG1vZGVsLm1lc2gubm9ybWFsQnVmZmVyKTtcclxuICAgIGdsLnZlcnRleEF0dHJpYlBvaW50ZXIocHJvZ3JhbS52ZXJ0ZXhOb3JtYWxBdHRyaWJ1dGUsIG1vZGVsLm1lc2gubm9ybWFsQnVmZmVyLml0ZW1TaXplLCBnbC5GTE9BVCwgZmFsc2UsIDAsIDApO1xyXG5cclxuICAgIGlmIChtb2RlbC5tZXNoLnRleHR1cmVzLmxlbmd0aCkge1xyXG4gICAgICAgIGdsLmVuYWJsZVZlcnRleEF0dHJpYkFycmF5KHByb2dyYW0udGV4dHVyZUNvb3JkQXR0cmlidXRlKTtcclxuICAgICAgICBnbC5iaW5kQnVmZmVyKGdsLkFSUkFZX0JVRkZFUiwgbWVzaC50ZXh0dXJlQnVmZmVyKTtcclxuICAgICAgICBnbC52ZXJ0ZXhBdHRyaWJQb2ludGVyKHByb2dyYW0udGV4dHVyZUNvb3JkQXR0cmlidXRlLCBtZXNoLnRleHR1cmVCdWZmZXIuaXRlbVNpemUsIGdsLkZMT0FULCBmYWxzZSwgMCwgMCk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICBnbC5kaXNhYmxlVmVydGV4QXR0cmliQXJyYXkocHJvZ3JhbS50ZXh0dXJlQ29vcmRBdHRyaWJ1dGUpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBnbC5iaW5kQnVmZmVyKGdsLkVMRU1FTlRfQVJSQVlfQlVGRkVSLCBtb2RlbC5tZXNoLmluZGV4QnVmZmVyKTtcclxuICAgIHNldE1hdHJpeFVuaWZvcm1zKHByb2dyYW1Db250ZXh0KTsgXHJcbiAgICBnbC5kcmF3RWxlbWVudHMoZ2wuVFJJQU5HTEVTLCBtb2RlbC5tZXNoLmluZGV4QnVmZmVyLm51bUl0ZW1zLCBnbC5VTlNJR05FRF9TSE9SVCwgMCk7XHJcbiAgICBcclxufTtcclxuXHJcbmNvbnN0IGRyYXdTY2VuZSA9IChwcm9ncmFtQ29udGV4dCkgPT4ge1xyXG4gICAgXHJcbiAgICB2YXIgZ2wgPSBwcm9ncmFtQ29udGV4dC5nbDtcclxuXHJcbiAgICBnbC5jbGVhcihnbC5DT0xPUl9CVUZGRVJfQklUIHwgZ2wuREVQVEhfQlVGRkVSX0JJVCk7XHJcbiAgICBnbG1hdHJpeC5tYXQ0LnBlcnNwZWN0aXZlKGFwcC5wTWF0cml4LCA0NSwgZ2wudmlld3BvcnRXaWR0aCAvIGdsLnZpZXdwb3J0SGVpZ2h0LCAwLjAxLCAxMDAwLjApO1xyXG4gICAgLy8gZ2xtYXRyaXgubWF0NC5wZXJzcGVjdGl2ZSg0NSwgZ2wudmlld3BvcnRXaWR0aCAvIGdsLnZpZXdwb3J0SGVpZ2h0LCAwLjAxLCAxMDAwLjAsIGFwcC5wTWF0cml4KTtcclxuICAgIGdsbWF0cml4Lm1hdDQuaWRlbnRpdHkoYXBwLm12TWF0cml4KTtcclxuICAgIC8vIG1vdmUgdGhlIGNhbWVyYVxyXG4gICAgZ2xtYXRyaXgubWF0NC50cmFuc2xhdGUoYXBwLnBNYXRyaXgsIGFwcC5tdk1hdHJpeCwgWzAsIDAsIC01XSk7XHJcbiAgICAvLyBzZXQgdXAgdGhlIHNjZW5lXHJcbiAgICAvL212UHVzaE1hdHJpeCgpO1xyXG4gICAgZHJhd09iamVjdChwcm9ncmFtQ29udGV4dCwgYXBwLm1vZGVscy5teV9jdWJlKTtcclxuICAgIC8vbXZQb3BNYXRyaXgoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gbXZQdXNoTWF0cml4KCkge1xyXG4gICAgdmFyIGNvcHkgPSBnbG1hdHJpeC5tYXQ0LmNyZWF0ZSgpO1xyXG4gICAgZ2xtYXRyaXgubWF0NC5zZXQoYXBwLm12TWF0cml4LCBjb3B5KTtcclxuICAgIGFwcC5tdk1hdHJpeFN0YWNrLnB1c2goY29weSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG12UG9wTWF0cml4KCl7XHJcbiAgICBpZiAoYXBwLm12TWF0cml4U3RhY2subGVuZ3RoID09IDApe1xyXG4gICAgICAgIHRocm93IFwiSW52YWxpZCBwb3BNYXRyaXghXCI7XHJcbiAgICB9XHJcbiAgICBhcHAubXZNYXRyaXggPSBhcHAubXZNYXRyaXhTdGFjay5wb3AoKTtcclxufVxyXG4iLCJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuc2V0TWF0cml4QXJyYXlUeXBlID0gc2V0TWF0cml4QXJyYXlUeXBlO1xuZXhwb3J0cy50b1JhZGlhbiA9IHRvUmFkaWFuO1xuZXhwb3J0cy5lcXVhbHMgPSBlcXVhbHM7XG5leHBvcnRzLlJBTkRPTSA9IGV4cG9ydHMuQVJSQVlfVFlQRSA9IGV4cG9ydHMuRVBTSUxPTiA9IHZvaWQgMDtcblxuLyoqXHJcbiAqIENvbW1vbiB1dGlsaXRpZXNcclxuICogQG1vZHVsZSBnbE1hdHJpeFxyXG4gKi9cbi8vIENvbmZpZ3VyYXRpb24gQ29uc3RhbnRzXG52YXIgRVBTSUxPTiA9IDAuMDAwMDAxO1xuZXhwb3J0cy5FUFNJTE9OID0gRVBTSUxPTjtcbnZhciBBUlJBWV9UWVBFID0gdHlwZW9mIEZsb2F0MzJBcnJheSAhPT0gJ3VuZGVmaW5lZCcgPyBGbG9hdDMyQXJyYXkgOiBBcnJheTtcbmV4cG9ydHMuQVJSQVlfVFlQRSA9IEFSUkFZX1RZUEU7XG52YXIgUkFORE9NID0gTWF0aC5yYW5kb207XG4vKipcclxuICogU2V0cyB0aGUgdHlwZSBvZiBhcnJheSB1c2VkIHdoZW4gY3JlYXRpbmcgbmV3IHZlY3RvcnMgYW5kIG1hdHJpY2VzXHJcbiAqXHJcbiAqIEBwYXJhbSB7VHlwZX0gdHlwZSBBcnJheSB0eXBlLCBzdWNoIGFzIEZsb2F0MzJBcnJheSBvciBBcnJheVxyXG4gKi9cblxuZXhwb3J0cy5SQU5ET00gPSBSQU5ET007XG5cbmZ1bmN0aW9uIHNldE1hdHJpeEFycmF5VHlwZSh0eXBlKSB7XG4gIGV4cG9ydHMuQVJSQVlfVFlQRSA9IEFSUkFZX1RZUEUgPSB0eXBlO1xufVxuXG52YXIgZGVncmVlID0gTWF0aC5QSSAvIDE4MDtcbi8qKlxyXG4gKiBDb252ZXJ0IERlZ3JlZSBUbyBSYWRpYW5cclxuICpcclxuICogQHBhcmFtIHtOdW1iZXJ9IGEgQW5nbGUgaW4gRGVncmVlc1xyXG4gKi9cblxuZnVuY3Rpb24gdG9SYWRpYW4oYSkge1xuICByZXR1cm4gYSAqIGRlZ3JlZTtcbn1cbi8qKlxyXG4gKiBUZXN0cyB3aGV0aGVyIG9yIG5vdCB0aGUgYXJndW1lbnRzIGhhdmUgYXBwcm94aW1hdGVseSB0aGUgc2FtZSB2YWx1ZSwgd2l0aGluIGFuIGFic29sdXRlXHJcbiAqIG9yIHJlbGF0aXZlIHRvbGVyYW5jZSBvZiBnbE1hdHJpeC5FUFNJTE9OIChhbiBhYnNvbHV0ZSB0b2xlcmFuY2UgaXMgdXNlZCBmb3IgdmFsdWVzIGxlc3NcclxuICogdGhhbiBvciBlcXVhbCB0byAxLjAsIGFuZCBhIHJlbGF0aXZlIHRvbGVyYW5jZSBpcyB1c2VkIGZvciBsYXJnZXIgdmFsdWVzKVxyXG4gKlxyXG4gKiBAcGFyYW0ge051bWJlcn0gYSBUaGUgZmlyc3QgbnVtYmVyIHRvIHRlc3QuXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBiIFRoZSBzZWNvbmQgbnVtYmVyIHRvIHRlc3QuXHJcbiAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIHRoZSBudW1iZXJzIGFyZSBhcHByb3hpbWF0ZWx5IGVxdWFsLCBmYWxzZSBvdGhlcndpc2UuXHJcbiAqL1xuXG5cbmZ1bmN0aW9uIGVxdWFscyhhLCBiKSB7XG4gIHJldHVybiBNYXRoLmFicyhhIC0gYikgPD0gRVBTSUxPTiAqIE1hdGgubWF4KDEuMCwgTWF0aC5hYnMoYSksIE1hdGguYWJzKGIpKTtcbn1cblxuaWYgKCFNYXRoLmh5cG90KSBNYXRoLmh5cG90ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgeSA9IDAsXG4gICAgICBpID0gYXJndW1lbnRzLmxlbmd0aDtcblxuICB3aGlsZSAoaS0tKSB7XG4gICAgeSArPSBhcmd1bWVudHNbaV0gKiBhcmd1bWVudHNbaV07XG4gIH1cblxuICByZXR1cm4gTWF0aC5zcXJ0KHkpO1xufTsiLCJcInVzZSBzdHJpY3RcIjtcblxuZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgXCJAYmFiZWwvaGVscGVycyAtIHR5cGVvZlwiOyBpZiAodHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIHR5cGVvZiBTeW1ib2wuaXRlcmF0b3IgPT09IFwic3ltYm9sXCIpIHsgX3R5cGVvZiA9IGZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IHJldHVybiB0eXBlb2Ygb2JqOyB9OyB9IGVsc2UgeyBfdHlwZW9mID0gZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgcmV0dXJuIG9iaiAmJiB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgb2JqLmNvbnN0cnVjdG9yID09PSBTeW1ib2wgJiYgb2JqICE9PSBTeW1ib2wucHJvdG90eXBlID8gXCJzeW1ib2xcIiA6IHR5cGVvZiBvYmo7IH07IH0gcmV0dXJuIF90eXBlb2Yob2JqKTsgfVxuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy52ZWM0ID0gZXhwb3J0cy52ZWMzID0gZXhwb3J0cy52ZWMyID0gZXhwb3J0cy5xdWF0MiA9IGV4cG9ydHMucXVhdCA9IGV4cG9ydHMubWF0NCA9IGV4cG9ydHMubWF0MyA9IGV4cG9ydHMubWF0MmQgPSBleHBvcnRzLm1hdDIgPSBleHBvcnRzLmdsTWF0cml4ID0gdm9pZCAwO1xuXG52YXIgZ2xNYXRyaXggPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChyZXF1aXJlKFwiLi9jb21tb24uanNcIikpO1xuXG5leHBvcnRzLmdsTWF0cml4ID0gZ2xNYXRyaXg7XG5cbnZhciBtYXQyID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQocmVxdWlyZShcIi4vbWF0Mi5qc1wiKSk7XG5cbmV4cG9ydHMubWF0MiA9IG1hdDI7XG5cbnZhciBtYXQyZCA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKHJlcXVpcmUoXCIuL21hdDJkLmpzXCIpKTtcblxuZXhwb3J0cy5tYXQyZCA9IG1hdDJkO1xuXG52YXIgbWF0MyA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKHJlcXVpcmUoXCIuL21hdDMuanNcIikpO1xuXG5leHBvcnRzLm1hdDMgPSBtYXQzO1xuXG52YXIgbWF0NCA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKHJlcXVpcmUoXCIuL21hdDQuanNcIikpO1xuXG5leHBvcnRzLm1hdDQgPSBtYXQ0O1xuXG52YXIgcXVhdCA9IF9pbnRlcm9wUmVxdWlyZVdpbGRjYXJkKHJlcXVpcmUoXCIuL3F1YXQuanNcIikpO1xuXG5leHBvcnRzLnF1YXQgPSBxdWF0O1xuXG52YXIgcXVhdDIgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChyZXF1aXJlKFwiLi9xdWF0Mi5qc1wiKSk7XG5cbmV4cG9ydHMucXVhdDIgPSBxdWF0MjtcblxudmFyIHZlYzIgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChyZXF1aXJlKFwiLi92ZWMyLmpzXCIpKTtcblxuZXhwb3J0cy52ZWMyID0gdmVjMjtcblxudmFyIHZlYzMgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChyZXF1aXJlKFwiLi92ZWMzLmpzXCIpKTtcblxuZXhwb3J0cy52ZWMzID0gdmVjMztcblxudmFyIHZlYzQgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChyZXF1aXJlKFwiLi92ZWM0LmpzXCIpKTtcblxuZXhwb3J0cy52ZWM0ID0gdmVjNDtcblxuZnVuY3Rpb24gX2dldFJlcXVpcmVXaWxkY2FyZENhY2hlKCkgeyBpZiAodHlwZW9mIFdlYWtNYXAgIT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIG51bGw7IHZhciBjYWNoZSA9IG5ldyBXZWFrTWFwKCk7IF9nZXRSZXF1aXJlV2lsZGNhcmRDYWNoZSA9IGZ1bmN0aW9uIF9nZXRSZXF1aXJlV2lsZGNhcmRDYWNoZSgpIHsgcmV0dXJuIGNhY2hlOyB9OyByZXR1cm4gY2FjaGU7IH1cblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQob2JqKSB7IGlmIChvYmogJiYgb2JqLl9fZXNNb2R1bGUpIHsgcmV0dXJuIG9iajsgfSBpZiAob2JqID09PSBudWxsIHx8IF90eXBlb2Yob2JqKSAhPT0gXCJvYmplY3RcIiAmJiB0eXBlb2Ygb2JqICE9PSBcImZ1bmN0aW9uXCIpIHsgcmV0dXJuIHsgXCJkZWZhdWx0XCI6IG9iaiB9OyB9IHZhciBjYWNoZSA9IF9nZXRSZXF1aXJlV2lsZGNhcmRDYWNoZSgpOyBpZiAoY2FjaGUgJiYgY2FjaGUuaGFzKG9iaikpIHsgcmV0dXJuIGNhY2hlLmdldChvYmopOyB9IHZhciBuZXdPYmogPSB7fTsgdmFyIGhhc1Byb3BlcnR5RGVzY3JpcHRvciA9IE9iamVjdC5kZWZpbmVQcm9wZXJ0eSAmJiBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yOyBmb3IgKHZhciBrZXkgaW4gb2JqKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpKSB7IHZhciBkZXNjID0gaGFzUHJvcGVydHlEZXNjcmlwdG9yID8gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmosIGtleSkgOiBudWxsOyBpZiAoZGVzYyAmJiAoZGVzYy5nZXQgfHwgZGVzYy5zZXQpKSB7IE9iamVjdC5kZWZpbmVQcm9wZXJ0eShuZXdPYmosIGtleSwgZGVzYyk7IH0gZWxzZSB7IG5ld09ialtrZXldID0gb2JqW2tleV07IH0gfSB9IG5ld09ialtcImRlZmF1bHRcIl0gPSBvYmo7IGlmIChjYWNoZSkgeyBjYWNoZS5zZXQob2JqLCBuZXdPYmopOyB9IHJldHVybiBuZXdPYmo7IH0iLCJcInVzZSBzdHJpY3RcIjtcblxuZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgXCJAYmFiZWwvaGVscGVycyAtIHR5cGVvZlwiOyBpZiAodHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIHR5cGVvZiBTeW1ib2wuaXRlcmF0b3IgPT09IFwic3ltYm9sXCIpIHsgX3R5cGVvZiA9IGZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IHJldHVybiB0eXBlb2Ygb2JqOyB9OyB9IGVsc2UgeyBfdHlwZW9mID0gZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgcmV0dXJuIG9iaiAmJiB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgb2JqLmNvbnN0cnVjdG9yID09PSBTeW1ib2wgJiYgb2JqICE9PSBTeW1ib2wucHJvdG90eXBlID8gXCJzeW1ib2xcIiA6IHR5cGVvZiBvYmo7IH07IH0gcmV0dXJuIF90eXBlb2Yob2JqKTsgfVxuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5jcmVhdGUgPSBjcmVhdGU7XG5leHBvcnRzLmNsb25lID0gY2xvbmU7XG5leHBvcnRzLmNvcHkgPSBjb3B5O1xuZXhwb3J0cy5pZGVudGl0eSA9IGlkZW50aXR5O1xuZXhwb3J0cy5mcm9tVmFsdWVzID0gZnJvbVZhbHVlcztcbmV4cG9ydHMuc2V0ID0gc2V0O1xuZXhwb3J0cy50cmFuc3Bvc2UgPSB0cmFuc3Bvc2U7XG5leHBvcnRzLmludmVydCA9IGludmVydDtcbmV4cG9ydHMuYWRqb2ludCA9IGFkam9pbnQ7XG5leHBvcnRzLmRldGVybWluYW50ID0gZGV0ZXJtaW5hbnQ7XG5leHBvcnRzLm11bHRpcGx5ID0gbXVsdGlwbHk7XG5leHBvcnRzLnJvdGF0ZSA9IHJvdGF0ZTtcbmV4cG9ydHMuc2NhbGUgPSBzY2FsZTtcbmV4cG9ydHMuZnJvbVJvdGF0aW9uID0gZnJvbVJvdGF0aW9uO1xuZXhwb3J0cy5mcm9tU2NhbGluZyA9IGZyb21TY2FsaW5nO1xuZXhwb3J0cy5zdHIgPSBzdHI7XG5leHBvcnRzLmZyb2IgPSBmcm9iO1xuZXhwb3J0cy5MRFUgPSBMRFU7XG5leHBvcnRzLmFkZCA9IGFkZDtcbmV4cG9ydHMuc3VidHJhY3QgPSBzdWJ0cmFjdDtcbmV4cG9ydHMuZXhhY3RFcXVhbHMgPSBleGFjdEVxdWFscztcbmV4cG9ydHMuZXF1YWxzID0gZXF1YWxzO1xuZXhwb3J0cy5tdWx0aXBseVNjYWxhciA9IG11bHRpcGx5U2NhbGFyO1xuZXhwb3J0cy5tdWx0aXBseVNjYWxhckFuZEFkZCA9IG11bHRpcGx5U2NhbGFyQW5kQWRkO1xuZXhwb3J0cy5zdWIgPSBleHBvcnRzLm11bCA9IHZvaWQgMDtcblxudmFyIGdsTWF0cml4ID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQocmVxdWlyZShcIi4vY29tbW9uLmpzXCIpKTtcblxuZnVuY3Rpb24gX2dldFJlcXVpcmVXaWxkY2FyZENhY2hlKCkgeyBpZiAodHlwZW9mIFdlYWtNYXAgIT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIG51bGw7IHZhciBjYWNoZSA9IG5ldyBXZWFrTWFwKCk7IF9nZXRSZXF1aXJlV2lsZGNhcmRDYWNoZSA9IGZ1bmN0aW9uIF9nZXRSZXF1aXJlV2lsZGNhcmRDYWNoZSgpIHsgcmV0dXJuIGNhY2hlOyB9OyByZXR1cm4gY2FjaGU7IH1cblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQob2JqKSB7IGlmIChvYmogJiYgb2JqLl9fZXNNb2R1bGUpIHsgcmV0dXJuIG9iajsgfSBpZiAob2JqID09PSBudWxsIHx8IF90eXBlb2Yob2JqKSAhPT0gXCJvYmplY3RcIiAmJiB0eXBlb2Ygb2JqICE9PSBcImZ1bmN0aW9uXCIpIHsgcmV0dXJuIHsgXCJkZWZhdWx0XCI6IG9iaiB9OyB9IHZhciBjYWNoZSA9IF9nZXRSZXF1aXJlV2lsZGNhcmRDYWNoZSgpOyBpZiAoY2FjaGUgJiYgY2FjaGUuaGFzKG9iaikpIHsgcmV0dXJuIGNhY2hlLmdldChvYmopOyB9IHZhciBuZXdPYmogPSB7fTsgdmFyIGhhc1Byb3BlcnR5RGVzY3JpcHRvciA9IE9iamVjdC5kZWZpbmVQcm9wZXJ0eSAmJiBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yOyBmb3IgKHZhciBrZXkgaW4gb2JqKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpKSB7IHZhciBkZXNjID0gaGFzUHJvcGVydHlEZXNjcmlwdG9yID8gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmosIGtleSkgOiBudWxsOyBpZiAoZGVzYyAmJiAoZGVzYy5nZXQgfHwgZGVzYy5zZXQpKSB7IE9iamVjdC5kZWZpbmVQcm9wZXJ0eShuZXdPYmosIGtleSwgZGVzYyk7IH0gZWxzZSB7IG5ld09ialtrZXldID0gb2JqW2tleV07IH0gfSB9IG5ld09ialtcImRlZmF1bHRcIl0gPSBvYmo7IGlmIChjYWNoZSkgeyBjYWNoZS5zZXQob2JqLCBuZXdPYmopOyB9IHJldHVybiBuZXdPYmo7IH1cblxuLyoqXHJcbiAqIDJ4MiBNYXRyaXhcclxuICogQG1vZHVsZSBtYXQyXHJcbiAqL1xuXG4vKipcclxuICogQ3JlYXRlcyBhIG5ldyBpZGVudGl0eSBtYXQyXHJcbiAqXHJcbiAqIEByZXR1cm5zIHttYXQyfSBhIG5ldyAyeDIgbWF0cml4XHJcbiAqL1xuZnVuY3Rpb24gY3JlYXRlKCkge1xuICB2YXIgb3V0ID0gbmV3IGdsTWF0cml4LkFSUkFZX1RZUEUoNCk7XG5cbiAgaWYgKGdsTWF0cml4LkFSUkFZX1RZUEUgIT0gRmxvYXQzMkFycmF5KSB7XG4gICAgb3V0WzFdID0gMDtcbiAgICBvdXRbMl0gPSAwO1xuICB9XG5cbiAgb3V0WzBdID0gMTtcbiAgb3V0WzNdID0gMTtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBDcmVhdGVzIGEgbmV3IG1hdDIgaW5pdGlhbGl6ZWQgd2l0aCB2YWx1ZXMgZnJvbSBhbiBleGlzdGluZyBtYXRyaXhcclxuICpcclxuICogQHBhcmFtIHttYXQyfSBhIG1hdHJpeCB0byBjbG9uZVxyXG4gKiBAcmV0dXJucyB7bWF0Mn0gYSBuZXcgMngyIG1hdHJpeFxyXG4gKi9cblxuXG5mdW5jdGlvbiBjbG9uZShhKSB7XG4gIHZhciBvdXQgPSBuZXcgZ2xNYXRyaXguQVJSQVlfVFlQRSg0KTtcbiAgb3V0WzBdID0gYVswXTtcbiAgb3V0WzFdID0gYVsxXTtcbiAgb3V0WzJdID0gYVsyXTtcbiAgb3V0WzNdID0gYVszXTtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBDb3B5IHRoZSB2YWx1ZXMgZnJvbSBvbmUgbWF0MiB0byBhbm90aGVyXHJcbiAqXHJcbiAqIEBwYXJhbSB7bWF0Mn0gb3V0IHRoZSByZWNlaXZpbmcgbWF0cml4XHJcbiAqIEBwYXJhbSB7bWF0Mn0gYSB0aGUgc291cmNlIG1hdHJpeFxyXG4gKiBAcmV0dXJucyB7bWF0Mn0gb3V0XHJcbiAqL1xuXG5cbmZ1bmN0aW9uIGNvcHkob3V0LCBhKSB7XG4gIG91dFswXSA9IGFbMF07XG4gIG91dFsxXSA9IGFbMV07XG4gIG91dFsyXSA9IGFbMl07XG4gIG91dFszXSA9IGFbM107XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogU2V0IGEgbWF0MiB0byB0aGUgaWRlbnRpdHkgbWF0cml4XHJcbiAqXHJcbiAqIEBwYXJhbSB7bWF0Mn0gb3V0IHRoZSByZWNlaXZpbmcgbWF0cml4XHJcbiAqIEByZXR1cm5zIHttYXQyfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gaWRlbnRpdHkob3V0KSB7XG4gIG91dFswXSA9IDE7XG4gIG91dFsxXSA9IDA7XG4gIG91dFsyXSA9IDA7XG4gIG91dFszXSA9IDE7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogQ3JlYXRlIGEgbmV3IG1hdDIgd2l0aCB0aGUgZ2l2ZW4gdmFsdWVzXHJcbiAqXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBtMDAgQ29tcG9uZW50IGluIGNvbHVtbiAwLCByb3cgMCBwb3NpdGlvbiAoaW5kZXggMClcclxuICogQHBhcmFtIHtOdW1iZXJ9IG0wMSBDb21wb25lbnQgaW4gY29sdW1uIDAsIHJvdyAxIHBvc2l0aW9uIChpbmRleCAxKVxyXG4gKiBAcGFyYW0ge051bWJlcn0gbTEwIENvbXBvbmVudCBpbiBjb2x1bW4gMSwgcm93IDAgcG9zaXRpb24gKGluZGV4IDIpXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBtMTEgQ29tcG9uZW50IGluIGNvbHVtbiAxLCByb3cgMSBwb3NpdGlvbiAoaW5kZXggMylcclxuICogQHJldHVybnMge21hdDJ9IG91dCBBIG5ldyAyeDIgbWF0cml4XHJcbiAqL1xuXG5cbmZ1bmN0aW9uIGZyb21WYWx1ZXMobTAwLCBtMDEsIG0xMCwgbTExKSB7XG4gIHZhciBvdXQgPSBuZXcgZ2xNYXRyaXguQVJSQVlfVFlQRSg0KTtcbiAgb3V0WzBdID0gbTAwO1xuICBvdXRbMV0gPSBtMDE7XG4gIG91dFsyXSA9IG0xMDtcbiAgb3V0WzNdID0gbTExO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIFNldCB0aGUgY29tcG9uZW50cyBvZiBhIG1hdDIgdG8gdGhlIGdpdmVuIHZhbHVlc1xyXG4gKlxyXG4gKiBAcGFyYW0ge21hdDJ9IG91dCB0aGUgcmVjZWl2aW5nIG1hdHJpeFxyXG4gKiBAcGFyYW0ge051bWJlcn0gbTAwIENvbXBvbmVudCBpbiBjb2x1bW4gMCwgcm93IDAgcG9zaXRpb24gKGluZGV4IDApXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBtMDEgQ29tcG9uZW50IGluIGNvbHVtbiAwLCByb3cgMSBwb3NpdGlvbiAoaW5kZXggMSlcclxuICogQHBhcmFtIHtOdW1iZXJ9IG0xMCBDb21wb25lbnQgaW4gY29sdW1uIDEsIHJvdyAwIHBvc2l0aW9uIChpbmRleCAyKVxyXG4gKiBAcGFyYW0ge051bWJlcn0gbTExIENvbXBvbmVudCBpbiBjb2x1bW4gMSwgcm93IDEgcG9zaXRpb24gKGluZGV4IDMpXHJcbiAqIEByZXR1cm5zIHttYXQyfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gc2V0KG91dCwgbTAwLCBtMDEsIG0xMCwgbTExKSB7XG4gIG91dFswXSA9IG0wMDtcbiAgb3V0WzFdID0gbTAxO1xuICBvdXRbMl0gPSBtMTA7XG4gIG91dFszXSA9IG0xMTtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBUcmFuc3Bvc2UgdGhlIHZhbHVlcyBvZiBhIG1hdDJcclxuICpcclxuICogQHBhcmFtIHttYXQyfSBvdXQgdGhlIHJlY2VpdmluZyBtYXRyaXhcclxuICogQHBhcmFtIHttYXQyfSBhIHRoZSBzb3VyY2UgbWF0cml4XHJcbiAqIEByZXR1cm5zIHttYXQyfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gdHJhbnNwb3NlKG91dCwgYSkge1xuICAvLyBJZiB3ZSBhcmUgdHJhbnNwb3Npbmcgb3Vyc2VsdmVzIHdlIGNhbiBza2lwIGEgZmV3IHN0ZXBzIGJ1dCBoYXZlIHRvIGNhY2hlXG4gIC8vIHNvbWUgdmFsdWVzXG4gIGlmIChvdXQgPT09IGEpIHtcbiAgICB2YXIgYTEgPSBhWzFdO1xuICAgIG91dFsxXSA9IGFbMl07XG4gICAgb3V0WzJdID0gYTE7XG4gIH0gZWxzZSB7XG4gICAgb3V0WzBdID0gYVswXTtcbiAgICBvdXRbMV0gPSBhWzJdO1xuICAgIG91dFsyXSA9IGFbMV07XG4gICAgb3V0WzNdID0gYVszXTtcbiAgfVxuXG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogSW52ZXJ0cyBhIG1hdDJcclxuICpcclxuICogQHBhcmFtIHttYXQyfSBvdXQgdGhlIHJlY2VpdmluZyBtYXRyaXhcclxuICogQHBhcmFtIHttYXQyfSBhIHRoZSBzb3VyY2UgbWF0cml4XHJcbiAqIEByZXR1cm5zIHttYXQyfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gaW52ZXJ0KG91dCwgYSkge1xuICB2YXIgYTAgPSBhWzBdLFxuICAgICAgYTEgPSBhWzFdLFxuICAgICAgYTIgPSBhWzJdLFxuICAgICAgYTMgPSBhWzNdOyAvLyBDYWxjdWxhdGUgdGhlIGRldGVybWluYW50XG5cbiAgdmFyIGRldCA9IGEwICogYTMgLSBhMiAqIGExO1xuXG4gIGlmICghZGV0KSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBkZXQgPSAxLjAgLyBkZXQ7XG4gIG91dFswXSA9IGEzICogZGV0O1xuICBvdXRbMV0gPSAtYTEgKiBkZXQ7XG4gIG91dFsyXSA9IC1hMiAqIGRldDtcbiAgb3V0WzNdID0gYTAgKiBkZXQ7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogQ2FsY3VsYXRlcyB0aGUgYWRqdWdhdGUgb2YgYSBtYXQyXHJcbiAqXHJcbiAqIEBwYXJhbSB7bWF0Mn0gb3V0IHRoZSByZWNlaXZpbmcgbWF0cml4XHJcbiAqIEBwYXJhbSB7bWF0Mn0gYSB0aGUgc291cmNlIG1hdHJpeFxyXG4gKiBAcmV0dXJucyB7bWF0Mn0gb3V0XHJcbiAqL1xuXG5cbmZ1bmN0aW9uIGFkam9pbnQob3V0LCBhKSB7XG4gIC8vIENhY2hpbmcgdGhpcyB2YWx1ZSBpcyBuZXNzZWNhcnkgaWYgb3V0ID09IGFcbiAgdmFyIGEwID0gYVswXTtcbiAgb3V0WzBdID0gYVszXTtcbiAgb3V0WzFdID0gLWFbMV07XG4gIG91dFsyXSA9IC1hWzJdO1xuICBvdXRbM10gPSBhMDtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBDYWxjdWxhdGVzIHRoZSBkZXRlcm1pbmFudCBvZiBhIG1hdDJcclxuICpcclxuICogQHBhcmFtIHttYXQyfSBhIHRoZSBzb3VyY2UgbWF0cml4XHJcbiAqIEByZXR1cm5zIHtOdW1iZXJ9IGRldGVybWluYW50IG9mIGFcclxuICovXG5cblxuZnVuY3Rpb24gZGV0ZXJtaW5hbnQoYSkge1xuICByZXR1cm4gYVswXSAqIGFbM10gLSBhWzJdICogYVsxXTtcbn1cbi8qKlxyXG4gKiBNdWx0aXBsaWVzIHR3byBtYXQyJ3NcclxuICpcclxuICogQHBhcmFtIHttYXQyfSBvdXQgdGhlIHJlY2VpdmluZyBtYXRyaXhcclxuICogQHBhcmFtIHttYXQyfSBhIHRoZSBmaXJzdCBvcGVyYW5kXHJcbiAqIEBwYXJhbSB7bWF0Mn0gYiB0aGUgc2Vjb25kIG9wZXJhbmRcclxuICogQHJldHVybnMge21hdDJ9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBtdWx0aXBseShvdXQsIGEsIGIpIHtcbiAgdmFyIGEwID0gYVswXSxcbiAgICAgIGExID0gYVsxXSxcbiAgICAgIGEyID0gYVsyXSxcbiAgICAgIGEzID0gYVszXTtcbiAgdmFyIGIwID0gYlswXSxcbiAgICAgIGIxID0gYlsxXSxcbiAgICAgIGIyID0gYlsyXSxcbiAgICAgIGIzID0gYlszXTtcbiAgb3V0WzBdID0gYTAgKiBiMCArIGEyICogYjE7XG4gIG91dFsxXSA9IGExICogYjAgKyBhMyAqIGIxO1xuICBvdXRbMl0gPSBhMCAqIGIyICsgYTIgKiBiMztcbiAgb3V0WzNdID0gYTEgKiBiMiArIGEzICogYjM7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogUm90YXRlcyBhIG1hdDIgYnkgdGhlIGdpdmVuIGFuZ2xlXHJcbiAqXHJcbiAqIEBwYXJhbSB7bWF0Mn0gb3V0IHRoZSByZWNlaXZpbmcgbWF0cml4XHJcbiAqIEBwYXJhbSB7bWF0Mn0gYSB0aGUgbWF0cml4IHRvIHJvdGF0ZVxyXG4gKiBAcGFyYW0ge051bWJlcn0gcmFkIHRoZSBhbmdsZSB0byByb3RhdGUgdGhlIG1hdHJpeCBieVxyXG4gKiBAcmV0dXJucyB7bWF0Mn0gb3V0XHJcbiAqL1xuXG5cbmZ1bmN0aW9uIHJvdGF0ZShvdXQsIGEsIHJhZCkge1xuICB2YXIgYTAgPSBhWzBdLFxuICAgICAgYTEgPSBhWzFdLFxuICAgICAgYTIgPSBhWzJdLFxuICAgICAgYTMgPSBhWzNdO1xuICB2YXIgcyA9IE1hdGguc2luKHJhZCk7XG4gIHZhciBjID0gTWF0aC5jb3MocmFkKTtcbiAgb3V0WzBdID0gYTAgKiBjICsgYTIgKiBzO1xuICBvdXRbMV0gPSBhMSAqIGMgKyBhMyAqIHM7XG4gIG91dFsyXSA9IGEwICogLXMgKyBhMiAqIGM7XG4gIG91dFszXSA9IGExICogLXMgKyBhMyAqIGM7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogU2NhbGVzIHRoZSBtYXQyIGJ5IHRoZSBkaW1lbnNpb25zIGluIHRoZSBnaXZlbiB2ZWMyXHJcbiAqXHJcbiAqIEBwYXJhbSB7bWF0Mn0gb3V0IHRoZSByZWNlaXZpbmcgbWF0cml4XHJcbiAqIEBwYXJhbSB7bWF0Mn0gYSB0aGUgbWF0cml4IHRvIHJvdGF0ZVxyXG4gKiBAcGFyYW0ge3ZlYzJ9IHYgdGhlIHZlYzIgdG8gc2NhbGUgdGhlIG1hdHJpeCBieVxyXG4gKiBAcmV0dXJucyB7bWF0Mn0gb3V0XHJcbiAqKi9cblxuXG5mdW5jdGlvbiBzY2FsZShvdXQsIGEsIHYpIHtcbiAgdmFyIGEwID0gYVswXSxcbiAgICAgIGExID0gYVsxXSxcbiAgICAgIGEyID0gYVsyXSxcbiAgICAgIGEzID0gYVszXTtcbiAgdmFyIHYwID0gdlswXSxcbiAgICAgIHYxID0gdlsxXTtcbiAgb3V0WzBdID0gYTAgKiB2MDtcbiAgb3V0WzFdID0gYTEgKiB2MDtcbiAgb3V0WzJdID0gYTIgKiB2MTtcbiAgb3V0WzNdID0gYTMgKiB2MTtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBDcmVhdGVzIGEgbWF0cml4IGZyb20gYSBnaXZlbiBhbmdsZVxyXG4gKiBUaGlzIGlzIGVxdWl2YWxlbnQgdG8gKGJ1dCBtdWNoIGZhc3RlciB0aGFuKTpcclxuICpcclxuICogICAgIG1hdDIuaWRlbnRpdHkoZGVzdCk7XHJcbiAqICAgICBtYXQyLnJvdGF0ZShkZXN0LCBkZXN0LCByYWQpO1xyXG4gKlxyXG4gKiBAcGFyYW0ge21hdDJ9IG91dCBtYXQyIHJlY2VpdmluZyBvcGVyYXRpb24gcmVzdWx0XHJcbiAqIEBwYXJhbSB7TnVtYmVyfSByYWQgdGhlIGFuZ2xlIHRvIHJvdGF0ZSB0aGUgbWF0cml4IGJ5XHJcbiAqIEByZXR1cm5zIHttYXQyfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gZnJvbVJvdGF0aW9uKG91dCwgcmFkKSB7XG4gIHZhciBzID0gTWF0aC5zaW4ocmFkKTtcbiAgdmFyIGMgPSBNYXRoLmNvcyhyYWQpO1xuICBvdXRbMF0gPSBjO1xuICBvdXRbMV0gPSBzO1xuICBvdXRbMl0gPSAtcztcbiAgb3V0WzNdID0gYztcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBDcmVhdGVzIGEgbWF0cml4IGZyb20gYSB2ZWN0b3Igc2NhbGluZ1xyXG4gKiBUaGlzIGlzIGVxdWl2YWxlbnQgdG8gKGJ1dCBtdWNoIGZhc3RlciB0aGFuKTpcclxuICpcclxuICogICAgIG1hdDIuaWRlbnRpdHkoZGVzdCk7XHJcbiAqICAgICBtYXQyLnNjYWxlKGRlc3QsIGRlc3QsIHZlYyk7XHJcbiAqXHJcbiAqIEBwYXJhbSB7bWF0Mn0gb3V0IG1hdDIgcmVjZWl2aW5nIG9wZXJhdGlvbiByZXN1bHRcclxuICogQHBhcmFtIHt2ZWMyfSB2IFNjYWxpbmcgdmVjdG9yXHJcbiAqIEByZXR1cm5zIHttYXQyfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gZnJvbVNjYWxpbmcob3V0LCB2KSB7XG4gIG91dFswXSA9IHZbMF07XG4gIG91dFsxXSA9IDA7XG4gIG91dFsyXSA9IDA7XG4gIG91dFszXSA9IHZbMV07XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogUmV0dXJucyBhIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiBhIG1hdDJcclxuICpcclxuICogQHBhcmFtIHttYXQyfSBhIG1hdHJpeCB0byByZXByZXNlbnQgYXMgYSBzdHJpbmdcclxuICogQHJldHVybnMge1N0cmluZ30gc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBtYXRyaXhcclxuICovXG5cblxuZnVuY3Rpb24gc3RyKGEpIHtcbiAgcmV0dXJuIFwibWF0MihcIiArIGFbMF0gKyBcIiwgXCIgKyBhWzFdICsgXCIsIFwiICsgYVsyXSArIFwiLCBcIiArIGFbM10gKyBcIilcIjtcbn1cbi8qKlxyXG4gKiBSZXR1cm5zIEZyb2Jlbml1cyBub3JtIG9mIGEgbWF0MlxyXG4gKlxyXG4gKiBAcGFyYW0ge21hdDJ9IGEgdGhlIG1hdHJpeCB0byBjYWxjdWxhdGUgRnJvYmVuaXVzIG5vcm0gb2ZcclxuICogQHJldHVybnMge051bWJlcn0gRnJvYmVuaXVzIG5vcm1cclxuICovXG5cblxuZnVuY3Rpb24gZnJvYihhKSB7XG4gIHJldHVybiBNYXRoLmh5cG90KGFbMF0sIGFbMV0sIGFbMl0sIGFbM10pO1xufVxuLyoqXHJcbiAqIFJldHVybnMgTCwgRCBhbmQgVSBtYXRyaWNlcyAoTG93ZXIgdHJpYW5ndWxhciwgRGlhZ29uYWwgYW5kIFVwcGVyIHRyaWFuZ3VsYXIpIGJ5IGZhY3Rvcml6aW5nIHRoZSBpbnB1dCBtYXRyaXhcclxuICogQHBhcmFtIHttYXQyfSBMIHRoZSBsb3dlciB0cmlhbmd1bGFyIG1hdHJpeFxyXG4gKiBAcGFyYW0ge21hdDJ9IEQgdGhlIGRpYWdvbmFsIG1hdHJpeFxyXG4gKiBAcGFyYW0ge21hdDJ9IFUgdGhlIHVwcGVyIHRyaWFuZ3VsYXIgbWF0cml4XHJcbiAqIEBwYXJhbSB7bWF0Mn0gYSB0aGUgaW5wdXQgbWF0cml4IHRvIGZhY3Rvcml6ZVxyXG4gKi9cblxuXG5mdW5jdGlvbiBMRFUoTCwgRCwgVSwgYSkge1xuICBMWzJdID0gYVsyXSAvIGFbMF07XG4gIFVbMF0gPSBhWzBdO1xuICBVWzFdID0gYVsxXTtcbiAgVVszXSA9IGFbM10gLSBMWzJdICogVVsxXTtcbiAgcmV0dXJuIFtMLCBELCBVXTtcbn1cbi8qKlxyXG4gKiBBZGRzIHR3byBtYXQyJ3NcclxuICpcclxuICogQHBhcmFtIHttYXQyfSBvdXQgdGhlIHJlY2VpdmluZyBtYXRyaXhcclxuICogQHBhcmFtIHttYXQyfSBhIHRoZSBmaXJzdCBvcGVyYW5kXHJcbiAqIEBwYXJhbSB7bWF0Mn0gYiB0aGUgc2Vjb25kIG9wZXJhbmRcclxuICogQHJldHVybnMge21hdDJ9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBhZGQob3V0LCBhLCBiKSB7XG4gIG91dFswXSA9IGFbMF0gKyBiWzBdO1xuICBvdXRbMV0gPSBhWzFdICsgYlsxXTtcbiAgb3V0WzJdID0gYVsyXSArIGJbMl07XG4gIG91dFszXSA9IGFbM10gKyBiWzNdO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIFN1YnRyYWN0cyBtYXRyaXggYiBmcm9tIG1hdHJpeCBhXHJcbiAqXHJcbiAqIEBwYXJhbSB7bWF0Mn0gb3V0IHRoZSByZWNlaXZpbmcgbWF0cml4XHJcbiAqIEBwYXJhbSB7bWF0Mn0gYSB0aGUgZmlyc3Qgb3BlcmFuZFxyXG4gKiBAcGFyYW0ge21hdDJ9IGIgdGhlIHNlY29uZCBvcGVyYW5kXHJcbiAqIEByZXR1cm5zIHttYXQyfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gc3VidHJhY3Qob3V0LCBhLCBiKSB7XG4gIG91dFswXSA9IGFbMF0gLSBiWzBdO1xuICBvdXRbMV0gPSBhWzFdIC0gYlsxXTtcbiAgb3V0WzJdID0gYVsyXSAtIGJbMl07XG4gIG91dFszXSA9IGFbM10gLSBiWzNdO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIFJldHVybnMgd2hldGhlciBvciBub3QgdGhlIG1hdHJpY2VzIGhhdmUgZXhhY3RseSB0aGUgc2FtZSBlbGVtZW50cyBpbiB0aGUgc2FtZSBwb3NpdGlvbiAod2hlbiBjb21wYXJlZCB3aXRoID09PSlcclxuICpcclxuICogQHBhcmFtIHttYXQyfSBhIFRoZSBmaXJzdCBtYXRyaXguXHJcbiAqIEBwYXJhbSB7bWF0Mn0gYiBUaGUgc2Vjb25kIG1hdHJpeC5cclxuICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgdGhlIG1hdHJpY2VzIGFyZSBlcXVhbCwgZmFsc2Ugb3RoZXJ3aXNlLlxyXG4gKi9cblxuXG5mdW5jdGlvbiBleGFjdEVxdWFscyhhLCBiKSB7XG4gIHJldHVybiBhWzBdID09PSBiWzBdICYmIGFbMV0gPT09IGJbMV0gJiYgYVsyXSA9PT0gYlsyXSAmJiBhWzNdID09PSBiWzNdO1xufVxuLyoqXHJcbiAqIFJldHVybnMgd2hldGhlciBvciBub3QgdGhlIG1hdHJpY2VzIGhhdmUgYXBwcm94aW1hdGVseSB0aGUgc2FtZSBlbGVtZW50cyBpbiB0aGUgc2FtZSBwb3NpdGlvbi5cclxuICpcclxuICogQHBhcmFtIHttYXQyfSBhIFRoZSBmaXJzdCBtYXRyaXguXHJcbiAqIEBwYXJhbSB7bWF0Mn0gYiBUaGUgc2Vjb25kIG1hdHJpeC5cclxuICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgdGhlIG1hdHJpY2VzIGFyZSBlcXVhbCwgZmFsc2Ugb3RoZXJ3aXNlLlxyXG4gKi9cblxuXG5mdW5jdGlvbiBlcXVhbHMoYSwgYikge1xuICB2YXIgYTAgPSBhWzBdLFxuICAgICAgYTEgPSBhWzFdLFxuICAgICAgYTIgPSBhWzJdLFxuICAgICAgYTMgPSBhWzNdO1xuICB2YXIgYjAgPSBiWzBdLFxuICAgICAgYjEgPSBiWzFdLFxuICAgICAgYjIgPSBiWzJdLFxuICAgICAgYjMgPSBiWzNdO1xuICByZXR1cm4gTWF0aC5hYnMoYTAgLSBiMCkgPD0gZ2xNYXRyaXguRVBTSUxPTiAqIE1hdGgubWF4KDEuMCwgTWF0aC5hYnMoYTApLCBNYXRoLmFicyhiMCkpICYmIE1hdGguYWJzKGExIC0gYjEpIDw9IGdsTWF0cml4LkVQU0lMT04gKiBNYXRoLm1heCgxLjAsIE1hdGguYWJzKGExKSwgTWF0aC5hYnMoYjEpKSAmJiBNYXRoLmFicyhhMiAtIGIyKSA8PSBnbE1hdHJpeC5FUFNJTE9OICogTWF0aC5tYXgoMS4wLCBNYXRoLmFicyhhMiksIE1hdGguYWJzKGIyKSkgJiYgTWF0aC5hYnMoYTMgLSBiMykgPD0gZ2xNYXRyaXguRVBTSUxPTiAqIE1hdGgubWF4KDEuMCwgTWF0aC5hYnMoYTMpLCBNYXRoLmFicyhiMykpO1xufVxuLyoqXHJcbiAqIE11bHRpcGx5IGVhY2ggZWxlbWVudCBvZiB0aGUgbWF0cml4IGJ5IGEgc2NhbGFyLlxyXG4gKlxyXG4gKiBAcGFyYW0ge21hdDJ9IG91dCB0aGUgcmVjZWl2aW5nIG1hdHJpeFxyXG4gKiBAcGFyYW0ge21hdDJ9IGEgdGhlIG1hdHJpeCB0byBzY2FsZVxyXG4gKiBAcGFyYW0ge051bWJlcn0gYiBhbW91bnQgdG8gc2NhbGUgdGhlIG1hdHJpeCdzIGVsZW1lbnRzIGJ5XHJcbiAqIEByZXR1cm5zIHttYXQyfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gbXVsdGlwbHlTY2FsYXIob3V0LCBhLCBiKSB7XG4gIG91dFswXSA9IGFbMF0gKiBiO1xuICBvdXRbMV0gPSBhWzFdICogYjtcbiAgb3V0WzJdID0gYVsyXSAqIGI7XG4gIG91dFszXSA9IGFbM10gKiBiO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIEFkZHMgdHdvIG1hdDIncyBhZnRlciBtdWx0aXBseWluZyBlYWNoIGVsZW1lbnQgb2YgdGhlIHNlY29uZCBvcGVyYW5kIGJ5IGEgc2NhbGFyIHZhbHVlLlxyXG4gKlxyXG4gKiBAcGFyYW0ge21hdDJ9IG91dCB0aGUgcmVjZWl2aW5nIHZlY3RvclxyXG4gKiBAcGFyYW0ge21hdDJ9IGEgdGhlIGZpcnN0IG9wZXJhbmRcclxuICogQHBhcmFtIHttYXQyfSBiIHRoZSBzZWNvbmQgb3BlcmFuZFxyXG4gKiBAcGFyYW0ge051bWJlcn0gc2NhbGUgdGhlIGFtb3VudCB0byBzY2FsZSBiJ3MgZWxlbWVudHMgYnkgYmVmb3JlIGFkZGluZ1xyXG4gKiBAcmV0dXJucyB7bWF0Mn0gb3V0XHJcbiAqL1xuXG5cbmZ1bmN0aW9uIG11bHRpcGx5U2NhbGFyQW5kQWRkKG91dCwgYSwgYiwgc2NhbGUpIHtcbiAgb3V0WzBdID0gYVswXSArIGJbMF0gKiBzY2FsZTtcbiAgb3V0WzFdID0gYVsxXSArIGJbMV0gKiBzY2FsZTtcbiAgb3V0WzJdID0gYVsyXSArIGJbMl0gKiBzY2FsZTtcbiAgb3V0WzNdID0gYVszXSArIGJbM10gKiBzY2FsZTtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBBbGlhcyBmb3Ige0BsaW5rIG1hdDIubXVsdGlwbHl9XHJcbiAqIEBmdW5jdGlvblxyXG4gKi9cblxuXG52YXIgbXVsID0gbXVsdGlwbHk7XG4vKipcclxuICogQWxpYXMgZm9yIHtAbGluayBtYXQyLnN1YnRyYWN0fVxyXG4gKiBAZnVuY3Rpb25cclxuICovXG5cbmV4cG9ydHMubXVsID0gbXVsO1xudmFyIHN1YiA9IHN1YnRyYWN0O1xuZXhwb3J0cy5zdWIgPSBzdWI7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IFwiQGJhYmVsL2hlbHBlcnMgLSB0eXBlb2ZcIjsgaWYgKHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiB0eXBlb2YgU3ltYm9sLml0ZXJhdG9yID09PSBcInN5bWJvbFwiKSB7IF90eXBlb2YgPSBmdW5jdGlvbiBfdHlwZW9mKG9iaikgeyByZXR1cm4gdHlwZW9mIG9iajsgfTsgfSBlbHNlIHsgX3R5cGVvZiA9IGZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IHJldHVybiBvYmogJiYgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9iai5jb25zdHJ1Y3RvciA9PT0gU3ltYm9sICYmIG9iaiAhPT0gU3ltYm9sLnByb3RvdHlwZSA/IFwic3ltYm9sXCIgOiB0eXBlb2Ygb2JqOyB9OyB9IHJldHVybiBfdHlwZW9mKG9iaik7IH1cblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuY3JlYXRlID0gY3JlYXRlO1xuZXhwb3J0cy5jbG9uZSA9IGNsb25lO1xuZXhwb3J0cy5jb3B5ID0gY29weTtcbmV4cG9ydHMuaWRlbnRpdHkgPSBpZGVudGl0eTtcbmV4cG9ydHMuZnJvbVZhbHVlcyA9IGZyb21WYWx1ZXM7XG5leHBvcnRzLnNldCA9IHNldDtcbmV4cG9ydHMuaW52ZXJ0ID0gaW52ZXJ0O1xuZXhwb3J0cy5kZXRlcm1pbmFudCA9IGRldGVybWluYW50O1xuZXhwb3J0cy5tdWx0aXBseSA9IG11bHRpcGx5O1xuZXhwb3J0cy5yb3RhdGUgPSByb3RhdGU7XG5leHBvcnRzLnNjYWxlID0gc2NhbGU7XG5leHBvcnRzLnRyYW5zbGF0ZSA9IHRyYW5zbGF0ZTtcbmV4cG9ydHMuZnJvbVJvdGF0aW9uID0gZnJvbVJvdGF0aW9uO1xuZXhwb3J0cy5mcm9tU2NhbGluZyA9IGZyb21TY2FsaW5nO1xuZXhwb3J0cy5mcm9tVHJhbnNsYXRpb24gPSBmcm9tVHJhbnNsYXRpb247XG5leHBvcnRzLnN0ciA9IHN0cjtcbmV4cG9ydHMuZnJvYiA9IGZyb2I7XG5leHBvcnRzLmFkZCA9IGFkZDtcbmV4cG9ydHMuc3VidHJhY3QgPSBzdWJ0cmFjdDtcbmV4cG9ydHMubXVsdGlwbHlTY2FsYXIgPSBtdWx0aXBseVNjYWxhcjtcbmV4cG9ydHMubXVsdGlwbHlTY2FsYXJBbmRBZGQgPSBtdWx0aXBseVNjYWxhckFuZEFkZDtcbmV4cG9ydHMuZXhhY3RFcXVhbHMgPSBleGFjdEVxdWFscztcbmV4cG9ydHMuZXF1YWxzID0gZXF1YWxzO1xuZXhwb3J0cy5zdWIgPSBleHBvcnRzLm11bCA9IHZvaWQgMDtcblxudmFyIGdsTWF0cml4ID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQocmVxdWlyZShcIi4vY29tbW9uLmpzXCIpKTtcblxuZnVuY3Rpb24gX2dldFJlcXVpcmVXaWxkY2FyZENhY2hlKCkgeyBpZiAodHlwZW9mIFdlYWtNYXAgIT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIG51bGw7IHZhciBjYWNoZSA9IG5ldyBXZWFrTWFwKCk7IF9nZXRSZXF1aXJlV2lsZGNhcmRDYWNoZSA9IGZ1bmN0aW9uIF9nZXRSZXF1aXJlV2lsZGNhcmRDYWNoZSgpIHsgcmV0dXJuIGNhY2hlOyB9OyByZXR1cm4gY2FjaGU7IH1cblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQob2JqKSB7IGlmIChvYmogJiYgb2JqLl9fZXNNb2R1bGUpIHsgcmV0dXJuIG9iajsgfSBpZiAob2JqID09PSBudWxsIHx8IF90eXBlb2Yob2JqKSAhPT0gXCJvYmplY3RcIiAmJiB0eXBlb2Ygb2JqICE9PSBcImZ1bmN0aW9uXCIpIHsgcmV0dXJuIHsgXCJkZWZhdWx0XCI6IG9iaiB9OyB9IHZhciBjYWNoZSA9IF9nZXRSZXF1aXJlV2lsZGNhcmRDYWNoZSgpOyBpZiAoY2FjaGUgJiYgY2FjaGUuaGFzKG9iaikpIHsgcmV0dXJuIGNhY2hlLmdldChvYmopOyB9IHZhciBuZXdPYmogPSB7fTsgdmFyIGhhc1Byb3BlcnR5RGVzY3JpcHRvciA9IE9iamVjdC5kZWZpbmVQcm9wZXJ0eSAmJiBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yOyBmb3IgKHZhciBrZXkgaW4gb2JqKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpKSB7IHZhciBkZXNjID0gaGFzUHJvcGVydHlEZXNjcmlwdG9yID8gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmosIGtleSkgOiBudWxsOyBpZiAoZGVzYyAmJiAoZGVzYy5nZXQgfHwgZGVzYy5zZXQpKSB7IE9iamVjdC5kZWZpbmVQcm9wZXJ0eShuZXdPYmosIGtleSwgZGVzYyk7IH0gZWxzZSB7IG5ld09ialtrZXldID0gb2JqW2tleV07IH0gfSB9IG5ld09ialtcImRlZmF1bHRcIl0gPSBvYmo7IGlmIChjYWNoZSkgeyBjYWNoZS5zZXQob2JqLCBuZXdPYmopOyB9IHJldHVybiBuZXdPYmo7IH1cblxuLyoqXHJcbiAqIDJ4MyBNYXRyaXhcclxuICogQG1vZHVsZSBtYXQyZFxyXG4gKiBAZGVzY3JpcHRpb25cclxuICogQSBtYXQyZCBjb250YWlucyBzaXggZWxlbWVudHMgZGVmaW5lZCBhczpcclxuICogPHByZT5cclxuICogW2EsIGIsXHJcbiAqICBjLCBkLFxyXG4gKiAgdHgsIHR5XVxyXG4gKiA8L3ByZT5cclxuICogVGhpcyBpcyBhIHNob3J0IGZvcm0gZm9yIHRoZSAzeDMgbWF0cml4OlxyXG4gKiA8cHJlPlxyXG4gKiBbYSwgYiwgMCxcclxuICogIGMsIGQsIDAsXHJcbiAqICB0eCwgdHksIDFdXHJcbiAqIDwvcHJlPlxyXG4gKiBUaGUgbGFzdCBjb2x1bW4gaXMgaWdub3JlZCBzbyB0aGUgYXJyYXkgaXMgc2hvcnRlciBhbmQgb3BlcmF0aW9ucyBhcmUgZmFzdGVyLlxyXG4gKi9cblxuLyoqXHJcbiAqIENyZWF0ZXMgYSBuZXcgaWRlbnRpdHkgbWF0MmRcclxuICpcclxuICogQHJldHVybnMge21hdDJkfSBhIG5ldyAyeDMgbWF0cml4XHJcbiAqL1xuZnVuY3Rpb24gY3JlYXRlKCkge1xuICB2YXIgb3V0ID0gbmV3IGdsTWF0cml4LkFSUkFZX1RZUEUoNik7XG5cbiAgaWYgKGdsTWF0cml4LkFSUkFZX1RZUEUgIT0gRmxvYXQzMkFycmF5KSB7XG4gICAgb3V0WzFdID0gMDtcbiAgICBvdXRbMl0gPSAwO1xuICAgIG91dFs0XSA9IDA7XG4gICAgb3V0WzVdID0gMDtcbiAgfVxuXG4gIG91dFswXSA9IDE7XG4gIG91dFszXSA9IDE7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogQ3JlYXRlcyBhIG5ldyBtYXQyZCBpbml0aWFsaXplZCB3aXRoIHZhbHVlcyBmcm9tIGFuIGV4aXN0aW5nIG1hdHJpeFxyXG4gKlxyXG4gKiBAcGFyYW0ge21hdDJkfSBhIG1hdHJpeCB0byBjbG9uZVxyXG4gKiBAcmV0dXJucyB7bWF0MmR9IGEgbmV3IDJ4MyBtYXRyaXhcclxuICovXG5cblxuZnVuY3Rpb24gY2xvbmUoYSkge1xuICB2YXIgb3V0ID0gbmV3IGdsTWF0cml4LkFSUkFZX1RZUEUoNik7XG4gIG91dFswXSA9IGFbMF07XG4gIG91dFsxXSA9IGFbMV07XG4gIG91dFsyXSA9IGFbMl07XG4gIG91dFszXSA9IGFbM107XG4gIG91dFs0XSA9IGFbNF07XG4gIG91dFs1XSA9IGFbNV07XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogQ29weSB0aGUgdmFsdWVzIGZyb20gb25lIG1hdDJkIHRvIGFub3RoZXJcclxuICpcclxuICogQHBhcmFtIHttYXQyZH0gb3V0IHRoZSByZWNlaXZpbmcgbWF0cml4XHJcbiAqIEBwYXJhbSB7bWF0MmR9IGEgdGhlIHNvdXJjZSBtYXRyaXhcclxuICogQHJldHVybnMge21hdDJkfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gY29weShvdXQsIGEpIHtcbiAgb3V0WzBdID0gYVswXTtcbiAgb3V0WzFdID0gYVsxXTtcbiAgb3V0WzJdID0gYVsyXTtcbiAgb3V0WzNdID0gYVszXTtcbiAgb3V0WzRdID0gYVs0XTtcbiAgb3V0WzVdID0gYVs1XTtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBTZXQgYSBtYXQyZCB0byB0aGUgaWRlbnRpdHkgbWF0cml4XHJcbiAqXHJcbiAqIEBwYXJhbSB7bWF0MmR9IG91dCB0aGUgcmVjZWl2aW5nIG1hdHJpeFxyXG4gKiBAcmV0dXJucyB7bWF0MmR9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBpZGVudGl0eShvdXQpIHtcbiAgb3V0WzBdID0gMTtcbiAgb3V0WzFdID0gMDtcbiAgb3V0WzJdID0gMDtcbiAgb3V0WzNdID0gMTtcbiAgb3V0WzRdID0gMDtcbiAgb3V0WzVdID0gMDtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBDcmVhdGUgYSBuZXcgbWF0MmQgd2l0aCB0aGUgZ2l2ZW4gdmFsdWVzXHJcbiAqXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBhIENvbXBvbmVudCBBIChpbmRleCAwKVxyXG4gKiBAcGFyYW0ge051bWJlcn0gYiBDb21wb25lbnQgQiAoaW5kZXggMSlcclxuICogQHBhcmFtIHtOdW1iZXJ9IGMgQ29tcG9uZW50IEMgKGluZGV4IDIpXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBkIENvbXBvbmVudCBEIChpbmRleCAzKVxyXG4gKiBAcGFyYW0ge051bWJlcn0gdHggQ29tcG9uZW50IFRYIChpbmRleCA0KVxyXG4gKiBAcGFyYW0ge051bWJlcn0gdHkgQ29tcG9uZW50IFRZIChpbmRleCA1KVxyXG4gKiBAcmV0dXJucyB7bWF0MmR9IEEgbmV3IG1hdDJkXHJcbiAqL1xuXG5cbmZ1bmN0aW9uIGZyb21WYWx1ZXMoYSwgYiwgYywgZCwgdHgsIHR5KSB7XG4gIHZhciBvdXQgPSBuZXcgZ2xNYXRyaXguQVJSQVlfVFlQRSg2KTtcbiAgb3V0WzBdID0gYTtcbiAgb3V0WzFdID0gYjtcbiAgb3V0WzJdID0gYztcbiAgb3V0WzNdID0gZDtcbiAgb3V0WzRdID0gdHg7XG4gIG91dFs1XSA9IHR5O1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIFNldCB0aGUgY29tcG9uZW50cyBvZiBhIG1hdDJkIHRvIHRoZSBnaXZlbiB2YWx1ZXNcclxuICpcclxuICogQHBhcmFtIHttYXQyZH0gb3V0IHRoZSByZWNlaXZpbmcgbWF0cml4XHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBhIENvbXBvbmVudCBBIChpbmRleCAwKVxyXG4gKiBAcGFyYW0ge051bWJlcn0gYiBDb21wb25lbnQgQiAoaW5kZXggMSlcclxuICogQHBhcmFtIHtOdW1iZXJ9IGMgQ29tcG9uZW50IEMgKGluZGV4IDIpXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBkIENvbXBvbmVudCBEIChpbmRleCAzKVxyXG4gKiBAcGFyYW0ge051bWJlcn0gdHggQ29tcG9uZW50IFRYIChpbmRleCA0KVxyXG4gKiBAcGFyYW0ge051bWJlcn0gdHkgQ29tcG9uZW50IFRZIChpbmRleCA1KVxyXG4gKiBAcmV0dXJucyB7bWF0MmR9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBzZXQob3V0LCBhLCBiLCBjLCBkLCB0eCwgdHkpIHtcbiAgb3V0WzBdID0gYTtcbiAgb3V0WzFdID0gYjtcbiAgb3V0WzJdID0gYztcbiAgb3V0WzNdID0gZDtcbiAgb3V0WzRdID0gdHg7XG4gIG91dFs1XSA9IHR5O1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIEludmVydHMgYSBtYXQyZFxyXG4gKlxyXG4gKiBAcGFyYW0ge21hdDJkfSBvdXQgdGhlIHJlY2VpdmluZyBtYXRyaXhcclxuICogQHBhcmFtIHttYXQyZH0gYSB0aGUgc291cmNlIG1hdHJpeFxyXG4gKiBAcmV0dXJucyB7bWF0MmR9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBpbnZlcnQob3V0LCBhKSB7XG4gIHZhciBhYSA9IGFbMF0sXG4gICAgICBhYiA9IGFbMV0sXG4gICAgICBhYyA9IGFbMl0sXG4gICAgICBhZCA9IGFbM107XG4gIHZhciBhdHggPSBhWzRdLFxuICAgICAgYXR5ID0gYVs1XTtcbiAgdmFyIGRldCA9IGFhICogYWQgLSBhYiAqIGFjO1xuXG4gIGlmICghZGV0KSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBkZXQgPSAxLjAgLyBkZXQ7XG4gIG91dFswXSA9IGFkICogZGV0O1xuICBvdXRbMV0gPSAtYWIgKiBkZXQ7XG4gIG91dFsyXSA9IC1hYyAqIGRldDtcbiAgb3V0WzNdID0gYWEgKiBkZXQ7XG4gIG91dFs0XSA9IChhYyAqIGF0eSAtIGFkICogYXR4KSAqIGRldDtcbiAgb3V0WzVdID0gKGFiICogYXR4IC0gYWEgKiBhdHkpICogZGV0O1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIENhbGN1bGF0ZXMgdGhlIGRldGVybWluYW50IG9mIGEgbWF0MmRcclxuICpcclxuICogQHBhcmFtIHttYXQyZH0gYSB0aGUgc291cmNlIG1hdHJpeFxyXG4gKiBAcmV0dXJucyB7TnVtYmVyfSBkZXRlcm1pbmFudCBvZiBhXHJcbiAqL1xuXG5cbmZ1bmN0aW9uIGRldGVybWluYW50KGEpIHtcbiAgcmV0dXJuIGFbMF0gKiBhWzNdIC0gYVsxXSAqIGFbMl07XG59XG4vKipcclxuICogTXVsdGlwbGllcyB0d28gbWF0MmQnc1xyXG4gKlxyXG4gKiBAcGFyYW0ge21hdDJkfSBvdXQgdGhlIHJlY2VpdmluZyBtYXRyaXhcclxuICogQHBhcmFtIHttYXQyZH0gYSB0aGUgZmlyc3Qgb3BlcmFuZFxyXG4gKiBAcGFyYW0ge21hdDJkfSBiIHRoZSBzZWNvbmQgb3BlcmFuZFxyXG4gKiBAcmV0dXJucyB7bWF0MmR9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBtdWx0aXBseShvdXQsIGEsIGIpIHtcbiAgdmFyIGEwID0gYVswXSxcbiAgICAgIGExID0gYVsxXSxcbiAgICAgIGEyID0gYVsyXSxcbiAgICAgIGEzID0gYVszXSxcbiAgICAgIGE0ID0gYVs0XSxcbiAgICAgIGE1ID0gYVs1XTtcbiAgdmFyIGIwID0gYlswXSxcbiAgICAgIGIxID0gYlsxXSxcbiAgICAgIGIyID0gYlsyXSxcbiAgICAgIGIzID0gYlszXSxcbiAgICAgIGI0ID0gYls0XSxcbiAgICAgIGI1ID0gYls1XTtcbiAgb3V0WzBdID0gYTAgKiBiMCArIGEyICogYjE7XG4gIG91dFsxXSA9IGExICogYjAgKyBhMyAqIGIxO1xuICBvdXRbMl0gPSBhMCAqIGIyICsgYTIgKiBiMztcbiAgb3V0WzNdID0gYTEgKiBiMiArIGEzICogYjM7XG4gIG91dFs0XSA9IGEwICogYjQgKyBhMiAqIGI1ICsgYTQ7XG4gIG91dFs1XSA9IGExICogYjQgKyBhMyAqIGI1ICsgYTU7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogUm90YXRlcyBhIG1hdDJkIGJ5IHRoZSBnaXZlbiBhbmdsZVxyXG4gKlxyXG4gKiBAcGFyYW0ge21hdDJkfSBvdXQgdGhlIHJlY2VpdmluZyBtYXRyaXhcclxuICogQHBhcmFtIHttYXQyZH0gYSB0aGUgbWF0cml4IHRvIHJvdGF0ZVxyXG4gKiBAcGFyYW0ge051bWJlcn0gcmFkIHRoZSBhbmdsZSB0byByb3RhdGUgdGhlIG1hdHJpeCBieVxyXG4gKiBAcmV0dXJucyB7bWF0MmR9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiByb3RhdGUob3V0LCBhLCByYWQpIHtcbiAgdmFyIGEwID0gYVswXSxcbiAgICAgIGExID0gYVsxXSxcbiAgICAgIGEyID0gYVsyXSxcbiAgICAgIGEzID0gYVszXSxcbiAgICAgIGE0ID0gYVs0XSxcbiAgICAgIGE1ID0gYVs1XTtcbiAgdmFyIHMgPSBNYXRoLnNpbihyYWQpO1xuICB2YXIgYyA9IE1hdGguY29zKHJhZCk7XG4gIG91dFswXSA9IGEwICogYyArIGEyICogcztcbiAgb3V0WzFdID0gYTEgKiBjICsgYTMgKiBzO1xuICBvdXRbMl0gPSBhMCAqIC1zICsgYTIgKiBjO1xuICBvdXRbM10gPSBhMSAqIC1zICsgYTMgKiBjO1xuICBvdXRbNF0gPSBhNDtcbiAgb3V0WzVdID0gYTU7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogU2NhbGVzIHRoZSBtYXQyZCBieSB0aGUgZGltZW5zaW9ucyBpbiB0aGUgZ2l2ZW4gdmVjMlxyXG4gKlxyXG4gKiBAcGFyYW0ge21hdDJkfSBvdXQgdGhlIHJlY2VpdmluZyBtYXRyaXhcclxuICogQHBhcmFtIHttYXQyZH0gYSB0aGUgbWF0cml4IHRvIHRyYW5zbGF0ZVxyXG4gKiBAcGFyYW0ge3ZlYzJ9IHYgdGhlIHZlYzIgdG8gc2NhbGUgdGhlIG1hdHJpeCBieVxyXG4gKiBAcmV0dXJucyB7bWF0MmR9IG91dFxyXG4gKiovXG5cblxuZnVuY3Rpb24gc2NhbGUob3V0LCBhLCB2KSB7XG4gIHZhciBhMCA9IGFbMF0sXG4gICAgICBhMSA9IGFbMV0sXG4gICAgICBhMiA9IGFbMl0sXG4gICAgICBhMyA9IGFbM10sXG4gICAgICBhNCA9IGFbNF0sXG4gICAgICBhNSA9IGFbNV07XG4gIHZhciB2MCA9IHZbMF0sXG4gICAgICB2MSA9IHZbMV07XG4gIG91dFswXSA9IGEwICogdjA7XG4gIG91dFsxXSA9IGExICogdjA7XG4gIG91dFsyXSA9IGEyICogdjE7XG4gIG91dFszXSA9IGEzICogdjE7XG4gIG91dFs0XSA9IGE0O1xuICBvdXRbNV0gPSBhNTtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBUcmFuc2xhdGVzIHRoZSBtYXQyZCBieSB0aGUgZGltZW5zaW9ucyBpbiB0aGUgZ2l2ZW4gdmVjMlxyXG4gKlxyXG4gKiBAcGFyYW0ge21hdDJkfSBvdXQgdGhlIHJlY2VpdmluZyBtYXRyaXhcclxuICogQHBhcmFtIHttYXQyZH0gYSB0aGUgbWF0cml4IHRvIHRyYW5zbGF0ZVxyXG4gKiBAcGFyYW0ge3ZlYzJ9IHYgdGhlIHZlYzIgdG8gdHJhbnNsYXRlIHRoZSBtYXRyaXggYnlcclxuICogQHJldHVybnMge21hdDJkfSBvdXRcclxuICoqL1xuXG5cbmZ1bmN0aW9uIHRyYW5zbGF0ZShvdXQsIGEsIHYpIHtcbiAgdmFyIGEwID0gYVswXSxcbiAgICAgIGExID0gYVsxXSxcbiAgICAgIGEyID0gYVsyXSxcbiAgICAgIGEzID0gYVszXSxcbiAgICAgIGE0ID0gYVs0XSxcbiAgICAgIGE1ID0gYVs1XTtcbiAgdmFyIHYwID0gdlswXSxcbiAgICAgIHYxID0gdlsxXTtcbiAgb3V0WzBdID0gYTA7XG4gIG91dFsxXSA9IGExO1xuICBvdXRbMl0gPSBhMjtcbiAgb3V0WzNdID0gYTM7XG4gIG91dFs0XSA9IGEwICogdjAgKyBhMiAqIHYxICsgYTQ7XG4gIG91dFs1XSA9IGExICogdjAgKyBhMyAqIHYxICsgYTU7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogQ3JlYXRlcyBhIG1hdHJpeCBmcm9tIGEgZ2l2ZW4gYW5nbGVcclxuICogVGhpcyBpcyBlcXVpdmFsZW50IHRvIChidXQgbXVjaCBmYXN0ZXIgdGhhbik6XHJcbiAqXHJcbiAqICAgICBtYXQyZC5pZGVudGl0eShkZXN0KTtcclxuICogICAgIG1hdDJkLnJvdGF0ZShkZXN0LCBkZXN0LCByYWQpO1xyXG4gKlxyXG4gKiBAcGFyYW0ge21hdDJkfSBvdXQgbWF0MmQgcmVjZWl2aW5nIG9wZXJhdGlvbiByZXN1bHRcclxuICogQHBhcmFtIHtOdW1iZXJ9IHJhZCB0aGUgYW5nbGUgdG8gcm90YXRlIHRoZSBtYXRyaXggYnlcclxuICogQHJldHVybnMge21hdDJkfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gZnJvbVJvdGF0aW9uKG91dCwgcmFkKSB7XG4gIHZhciBzID0gTWF0aC5zaW4ocmFkKSxcbiAgICAgIGMgPSBNYXRoLmNvcyhyYWQpO1xuICBvdXRbMF0gPSBjO1xuICBvdXRbMV0gPSBzO1xuICBvdXRbMl0gPSAtcztcbiAgb3V0WzNdID0gYztcbiAgb3V0WzRdID0gMDtcbiAgb3V0WzVdID0gMDtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBDcmVhdGVzIGEgbWF0cml4IGZyb20gYSB2ZWN0b3Igc2NhbGluZ1xyXG4gKiBUaGlzIGlzIGVxdWl2YWxlbnQgdG8gKGJ1dCBtdWNoIGZhc3RlciB0aGFuKTpcclxuICpcclxuICogICAgIG1hdDJkLmlkZW50aXR5KGRlc3QpO1xyXG4gKiAgICAgbWF0MmQuc2NhbGUoZGVzdCwgZGVzdCwgdmVjKTtcclxuICpcclxuICogQHBhcmFtIHttYXQyZH0gb3V0IG1hdDJkIHJlY2VpdmluZyBvcGVyYXRpb24gcmVzdWx0XHJcbiAqIEBwYXJhbSB7dmVjMn0gdiBTY2FsaW5nIHZlY3RvclxyXG4gKiBAcmV0dXJucyB7bWF0MmR9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBmcm9tU2NhbGluZyhvdXQsIHYpIHtcbiAgb3V0WzBdID0gdlswXTtcbiAgb3V0WzFdID0gMDtcbiAgb3V0WzJdID0gMDtcbiAgb3V0WzNdID0gdlsxXTtcbiAgb3V0WzRdID0gMDtcbiAgb3V0WzVdID0gMDtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBDcmVhdGVzIGEgbWF0cml4IGZyb20gYSB2ZWN0b3IgdHJhbnNsYXRpb25cclxuICogVGhpcyBpcyBlcXVpdmFsZW50IHRvIChidXQgbXVjaCBmYXN0ZXIgdGhhbik6XHJcbiAqXHJcbiAqICAgICBtYXQyZC5pZGVudGl0eShkZXN0KTtcclxuICogICAgIG1hdDJkLnRyYW5zbGF0ZShkZXN0LCBkZXN0LCB2ZWMpO1xyXG4gKlxyXG4gKiBAcGFyYW0ge21hdDJkfSBvdXQgbWF0MmQgcmVjZWl2aW5nIG9wZXJhdGlvbiByZXN1bHRcclxuICogQHBhcmFtIHt2ZWMyfSB2IFRyYW5zbGF0aW9uIHZlY3RvclxyXG4gKiBAcmV0dXJucyB7bWF0MmR9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBmcm9tVHJhbnNsYXRpb24ob3V0LCB2KSB7XG4gIG91dFswXSA9IDE7XG4gIG91dFsxXSA9IDA7XG4gIG91dFsyXSA9IDA7XG4gIG91dFszXSA9IDE7XG4gIG91dFs0XSA9IHZbMF07XG4gIG91dFs1XSA9IHZbMV07XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogUmV0dXJucyBhIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiBhIG1hdDJkXHJcbiAqXHJcbiAqIEBwYXJhbSB7bWF0MmR9IGEgbWF0cml4IHRvIHJlcHJlc2VudCBhcyBhIHN0cmluZ1xyXG4gKiBAcmV0dXJucyB7U3RyaW5nfSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgdGhlIG1hdHJpeFxyXG4gKi9cblxuXG5mdW5jdGlvbiBzdHIoYSkge1xuICByZXR1cm4gXCJtYXQyZChcIiArIGFbMF0gKyBcIiwgXCIgKyBhWzFdICsgXCIsIFwiICsgYVsyXSArIFwiLCBcIiArIGFbM10gKyBcIiwgXCIgKyBhWzRdICsgXCIsIFwiICsgYVs1XSArIFwiKVwiO1xufVxuLyoqXHJcbiAqIFJldHVybnMgRnJvYmVuaXVzIG5vcm0gb2YgYSBtYXQyZFxyXG4gKlxyXG4gKiBAcGFyYW0ge21hdDJkfSBhIHRoZSBtYXRyaXggdG8gY2FsY3VsYXRlIEZyb2Jlbml1cyBub3JtIG9mXHJcbiAqIEByZXR1cm5zIHtOdW1iZXJ9IEZyb2Jlbml1cyBub3JtXHJcbiAqL1xuXG5cbmZ1bmN0aW9uIGZyb2IoYSkge1xuICByZXR1cm4gTWF0aC5oeXBvdChhWzBdLCBhWzFdLCBhWzJdLCBhWzNdLCBhWzRdLCBhWzVdLCAxKTtcbn1cbi8qKlxyXG4gKiBBZGRzIHR3byBtYXQyZCdzXHJcbiAqXHJcbiAqIEBwYXJhbSB7bWF0MmR9IG91dCB0aGUgcmVjZWl2aW5nIG1hdHJpeFxyXG4gKiBAcGFyYW0ge21hdDJkfSBhIHRoZSBmaXJzdCBvcGVyYW5kXHJcbiAqIEBwYXJhbSB7bWF0MmR9IGIgdGhlIHNlY29uZCBvcGVyYW5kXHJcbiAqIEByZXR1cm5zIHttYXQyZH0gb3V0XHJcbiAqL1xuXG5cbmZ1bmN0aW9uIGFkZChvdXQsIGEsIGIpIHtcbiAgb3V0WzBdID0gYVswXSArIGJbMF07XG4gIG91dFsxXSA9IGFbMV0gKyBiWzFdO1xuICBvdXRbMl0gPSBhWzJdICsgYlsyXTtcbiAgb3V0WzNdID0gYVszXSArIGJbM107XG4gIG91dFs0XSA9IGFbNF0gKyBiWzRdO1xuICBvdXRbNV0gPSBhWzVdICsgYls1XTtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBTdWJ0cmFjdHMgbWF0cml4IGIgZnJvbSBtYXRyaXggYVxyXG4gKlxyXG4gKiBAcGFyYW0ge21hdDJkfSBvdXQgdGhlIHJlY2VpdmluZyBtYXRyaXhcclxuICogQHBhcmFtIHttYXQyZH0gYSB0aGUgZmlyc3Qgb3BlcmFuZFxyXG4gKiBAcGFyYW0ge21hdDJkfSBiIHRoZSBzZWNvbmQgb3BlcmFuZFxyXG4gKiBAcmV0dXJucyB7bWF0MmR9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBzdWJ0cmFjdChvdXQsIGEsIGIpIHtcbiAgb3V0WzBdID0gYVswXSAtIGJbMF07XG4gIG91dFsxXSA9IGFbMV0gLSBiWzFdO1xuICBvdXRbMl0gPSBhWzJdIC0gYlsyXTtcbiAgb3V0WzNdID0gYVszXSAtIGJbM107XG4gIG91dFs0XSA9IGFbNF0gLSBiWzRdO1xuICBvdXRbNV0gPSBhWzVdIC0gYls1XTtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBNdWx0aXBseSBlYWNoIGVsZW1lbnQgb2YgdGhlIG1hdHJpeCBieSBhIHNjYWxhci5cclxuICpcclxuICogQHBhcmFtIHttYXQyZH0gb3V0IHRoZSByZWNlaXZpbmcgbWF0cml4XHJcbiAqIEBwYXJhbSB7bWF0MmR9IGEgdGhlIG1hdHJpeCB0byBzY2FsZVxyXG4gKiBAcGFyYW0ge051bWJlcn0gYiBhbW91bnQgdG8gc2NhbGUgdGhlIG1hdHJpeCdzIGVsZW1lbnRzIGJ5XHJcbiAqIEByZXR1cm5zIHttYXQyZH0gb3V0XHJcbiAqL1xuXG5cbmZ1bmN0aW9uIG11bHRpcGx5U2NhbGFyKG91dCwgYSwgYikge1xuICBvdXRbMF0gPSBhWzBdICogYjtcbiAgb3V0WzFdID0gYVsxXSAqIGI7XG4gIG91dFsyXSA9IGFbMl0gKiBiO1xuICBvdXRbM10gPSBhWzNdICogYjtcbiAgb3V0WzRdID0gYVs0XSAqIGI7XG4gIG91dFs1XSA9IGFbNV0gKiBiO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIEFkZHMgdHdvIG1hdDJkJ3MgYWZ0ZXIgbXVsdGlwbHlpbmcgZWFjaCBlbGVtZW50IG9mIHRoZSBzZWNvbmQgb3BlcmFuZCBieSBhIHNjYWxhciB2YWx1ZS5cclxuICpcclxuICogQHBhcmFtIHttYXQyZH0gb3V0IHRoZSByZWNlaXZpbmcgdmVjdG9yXHJcbiAqIEBwYXJhbSB7bWF0MmR9IGEgdGhlIGZpcnN0IG9wZXJhbmRcclxuICogQHBhcmFtIHttYXQyZH0gYiB0aGUgc2Vjb25kIG9wZXJhbmRcclxuICogQHBhcmFtIHtOdW1iZXJ9IHNjYWxlIHRoZSBhbW91bnQgdG8gc2NhbGUgYidzIGVsZW1lbnRzIGJ5IGJlZm9yZSBhZGRpbmdcclxuICogQHJldHVybnMge21hdDJkfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gbXVsdGlwbHlTY2FsYXJBbmRBZGQob3V0LCBhLCBiLCBzY2FsZSkge1xuICBvdXRbMF0gPSBhWzBdICsgYlswXSAqIHNjYWxlO1xuICBvdXRbMV0gPSBhWzFdICsgYlsxXSAqIHNjYWxlO1xuICBvdXRbMl0gPSBhWzJdICsgYlsyXSAqIHNjYWxlO1xuICBvdXRbM10gPSBhWzNdICsgYlszXSAqIHNjYWxlO1xuICBvdXRbNF0gPSBhWzRdICsgYls0XSAqIHNjYWxlO1xuICBvdXRbNV0gPSBhWzVdICsgYls1XSAqIHNjYWxlO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIFJldHVybnMgd2hldGhlciBvciBub3QgdGhlIG1hdHJpY2VzIGhhdmUgZXhhY3RseSB0aGUgc2FtZSBlbGVtZW50cyBpbiB0aGUgc2FtZSBwb3NpdGlvbiAod2hlbiBjb21wYXJlZCB3aXRoID09PSlcclxuICpcclxuICogQHBhcmFtIHttYXQyZH0gYSBUaGUgZmlyc3QgbWF0cml4LlxyXG4gKiBAcGFyYW0ge21hdDJkfSBiIFRoZSBzZWNvbmQgbWF0cml4LlxyXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgbWF0cmljZXMgYXJlIGVxdWFsLCBmYWxzZSBvdGhlcndpc2UuXHJcbiAqL1xuXG5cbmZ1bmN0aW9uIGV4YWN0RXF1YWxzKGEsIGIpIHtcbiAgcmV0dXJuIGFbMF0gPT09IGJbMF0gJiYgYVsxXSA9PT0gYlsxXSAmJiBhWzJdID09PSBiWzJdICYmIGFbM10gPT09IGJbM10gJiYgYVs0XSA9PT0gYls0XSAmJiBhWzVdID09PSBiWzVdO1xufVxuLyoqXHJcbiAqIFJldHVybnMgd2hldGhlciBvciBub3QgdGhlIG1hdHJpY2VzIGhhdmUgYXBwcm94aW1hdGVseSB0aGUgc2FtZSBlbGVtZW50cyBpbiB0aGUgc2FtZSBwb3NpdGlvbi5cclxuICpcclxuICogQHBhcmFtIHttYXQyZH0gYSBUaGUgZmlyc3QgbWF0cml4LlxyXG4gKiBAcGFyYW0ge21hdDJkfSBiIFRoZSBzZWNvbmQgbWF0cml4LlxyXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgbWF0cmljZXMgYXJlIGVxdWFsLCBmYWxzZSBvdGhlcndpc2UuXHJcbiAqL1xuXG5cbmZ1bmN0aW9uIGVxdWFscyhhLCBiKSB7XG4gIHZhciBhMCA9IGFbMF0sXG4gICAgICBhMSA9IGFbMV0sXG4gICAgICBhMiA9IGFbMl0sXG4gICAgICBhMyA9IGFbM10sXG4gICAgICBhNCA9IGFbNF0sXG4gICAgICBhNSA9IGFbNV07XG4gIHZhciBiMCA9IGJbMF0sXG4gICAgICBiMSA9IGJbMV0sXG4gICAgICBiMiA9IGJbMl0sXG4gICAgICBiMyA9IGJbM10sXG4gICAgICBiNCA9IGJbNF0sXG4gICAgICBiNSA9IGJbNV07XG4gIHJldHVybiBNYXRoLmFicyhhMCAtIGIwKSA8PSBnbE1hdHJpeC5FUFNJTE9OICogTWF0aC5tYXgoMS4wLCBNYXRoLmFicyhhMCksIE1hdGguYWJzKGIwKSkgJiYgTWF0aC5hYnMoYTEgLSBiMSkgPD0gZ2xNYXRyaXguRVBTSUxPTiAqIE1hdGgubWF4KDEuMCwgTWF0aC5hYnMoYTEpLCBNYXRoLmFicyhiMSkpICYmIE1hdGguYWJzKGEyIC0gYjIpIDw9IGdsTWF0cml4LkVQU0lMT04gKiBNYXRoLm1heCgxLjAsIE1hdGguYWJzKGEyKSwgTWF0aC5hYnMoYjIpKSAmJiBNYXRoLmFicyhhMyAtIGIzKSA8PSBnbE1hdHJpeC5FUFNJTE9OICogTWF0aC5tYXgoMS4wLCBNYXRoLmFicyhhMyksIE1hdGguYWJzKGIzKSkgJiYgTWF0aC5hYnMoYTQgLSBiNCkgPD0gZ2xNYXRyaXguRVBTSUxPTiAqIE1hdGgubWF4KDEuMCwgTWF0aC5hYnMoYTQpLCBNYXRoLmFicyhiNCkpICYmIE1hdGguYWJzKGE1IC0gYjUpIDw9IGdsTWF0cml4LkVQU0lMT04gKiBNYXRoLm1heCgxLjAsIE1hdGguYWJzKGE1KSwgTWF0aC5hYnMoYjUpKTtcbn1cbi8qKlxyXG4gKiBBbGlhcyBmb3Ige0BsaW5rIG1hdDJkLm11bHRpcGx5fVxyXG4gKiBAZnVuY3Rpb25cclxuICovXG5cblxudmFyIG11bCA9IG11bHRpcGx5O1xuLyoqXHJcbiAqIEFsaWFzIGZvciB7QGxpbmsgbWF0MmQuc3VidHJhY3R9XHJcbiAqIEBmdW5jdGlvblxyXG4gKi9cblxuZXhwb3J0cy5tdWwgPSBtdWw7XG52YXIgc3ViID0gc3VidHJhY3Q7XG5leHBvcnRzLnN1YiA9IHN1YjsiLCJcInVzZSBzdHJpY3RcIjtcblxuZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgXCJAYmFiZWwvaGVscGVycyAtIHR5cGVvZlwiOyBpZiAodHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIHR5cGVvZiBTeW1ib2wuaXRlcmF0b3IgPT09IFwic3ltYm9sXCIpIHsgX3R5cGVvZiA9IGZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IHJldHVybiB0eXBlb2Ygb2JqOyB9OyB9IGVsc2UgeyBfdHlwZW9mID0gZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgcmV0dXJuIG9iaiAmJiB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgb2JqLmNvbnN0cnVjdG9yID09PSBTeW1ib2wgJiYgb2JqICE9PSBTeW1ib2wucHJvdG90eXBlID8gXCJzeW1ib2xcIiA6IHR5cGVvZiBvYmo7IH07IH0gcmV0dXJuIF90eXBlb2Yob2JqKTsgfVxuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuZXhwb3J0cy5jcmVhdGUgPSBjcmVhdGU7XG5leHBvcnRzLmZyb21NYXQ0ID0gZnJvbU1hdDQ7XG5leHBvcnRzLmNsb25lID0gY2xvbmU7XG5leHBvcnRzLmNvcHkgPSBjb3B5O1xuZXhwb3J0cy5mcm9tVmFsdWVzID0gZnJvbVZhbHVlcztcbmV4cG9ydHMuc2V0ID0gc2V0O1xuZXhwb3J0cy5pZGVudGl0eSA9IGlkZW50aXR5O1xuZXhwb3J0cy50cmFuc3Bvc2UgPSB0cmFuc3Bvc2U7XG5leHBvcnRzLmludmVydCA9IGludmVydDtcbmV4cG9ydHMuYWRqb2ludCA9IGFkam9pbnQ7XG5leHBvcnRzLmRldGVybWluYW50ID0gZGV0ZXJtaW5hbnQ7XG5leHBvcnRzLm11bHRpcGx5ID0gbXVsdGlwbHk7XG5leHBvcnRzLnRyYW5zbGF0ZSA9IHRyYW5zbGF0ZTtcbmV4cG9ydHMucm90YXRlID0gcm90YXRlO1xuZXhwb3J0cy5zY2FsZSA9IHNjYWxlO1xuZXhwb3J0cy5mcm9tVHJhbnNsYXRpb24gPSBmcm9tVHJhbnNsYXRpb247XG5leHBvcnRzLmZyb21Sb3RhdGlvbiA9IGZyb21Sb3RhdGlvbjtcbmV4cG9ydHMuZnJvbVNjYWxpbmcgPSBmcm9tU2NhbGluZztcbmV4cG9ydHMuZnJvbU1hdDJkID0gZnJvbU1hdDJkO1xuZXhwb3J0cy5mcm9tUXVhdCA9IGZyb21RdWF0O1xuZXhwb3J0cy5ub3JtYWxGcm9tTWF0NCA9IG5vcm1hbEZyb21NYXQ0O1xuZXhwb3J0cy5wcm9qZWN0aW9uID0gcHJvamVjdGlvbjtcbmV4cG9ydHMuc3RyID0gc3RyO1xuZXhwb3J0cy5mcm9iID0gZnJvYjtcbmV4cG9ydHMuYWRkID0gYWRkO1xuZXhwb3J0cy5zdWJ0cmFjdCA9IHN1YnRyYWN0O1xuZXhwb3J0cy5tdWx0aXBseVNjYWxhciA9IG11bHRpcGx5U2NhbGFyO1xuZXhwb3J0cy5tdWx0aXBseVNjYWxhckFuZEFkZCA9IG11bHRpcGx5U2NhbGFyQW5kQWRkO1xuZXhwb3J0cy5leGFjdEVxdWFscyA9IGV4YWN0RXF1YWxzO1xuZXhwb3J0cy5lcXVhbHMgPSBlcXVhbHM7XG5leHBvcnRzLnN1YiA9IGV4cG9ydHMubXVsID0gdm9pZCAwO1xuXG52YXIgZ2xNYXRyaXggPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChyZXF1aXJlKFwiLi9jb21tb24uanNcIikpO1xuXG5mdW5jdGlvbiBfZ2V0UmVxdWlyZVdpbGRjYXJkQ2FjaGUoKSB7IGlmICh0eXBlb2YgV2Vha01hcCAhPT0gXCJmdW5jdGlvblwiKSByZXR1cm4gbnVsbDsgdmFyIGNhY2hlID0gbmV3IFdlYWtNYXAoKTsgX2dldFJlcXVpcmVXaWxkY2FyZENhY2hlID0gZnVuY3Rpb24gX2dldFJlcXVpcmVXaWxkY2FyZENhY2hlKCkgeyByZXR1cm4gY2FjaGU7IH07IHJldHVybiBjYWNoZTsgfVxuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChvYmopIHsgaWYgKG9iaiAmJiBvYmouX19lc01vZHVsZSkgeyByZXR1cm4gb2JqOyB9IGlmIChvYmogPT09IG51bGwgfHwgX3R5cGVvZihvYmopICE9PSBcIm9iamVjdFwiICYmIHR5cGVvZiBvYmogIT09IFwiZnVuY3Rpb25cIikgeyByZXR1cm4geyBcImRlZmF1bHRcIjogb2JqIH07IH0gdmFyIGNhY2hlID0gX2dldFJlcXVpcmVXaWxkY2FyZENhY2hlKCk7IGlmIChjYWNoZSAmJiBjYWNoZS5oYXMob2JqKSkgeyByZXR1cm4gY2FjaGUuZ2V0KG9iaik7IH0gdmFyIG5ld09iaiA9IHt9OyB2YXIgaGFzUHJvcGVydHlEZXNjcmlwdG9yID0gT2JqZWN0LmRlZmluZVByb3BlcnR5ICYmIE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3I7IGZvciAodmFyIGtleSBpbiBvYmopIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSkpIHsgdmFyIGRlc2MgPSBoYXNQcm9wZXJ0eURlc2NyaXB0b3IgPyBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iaiwga2V5KSA6IG51bGw7IGlmIChkZXNjICYmIChkZXNjLmdldCB8fCBkZXNjLnNldCkpIHsgT2JqZWN0LmRlZmluZVByb3BlcnR5KG5ld09iaiwga2V5LCBkZXNjKTsgfSBlbHNlIHsgbmV3T2JqW2tleV0gPSBvYmpba2V5XTsgfSB9IH0gbmV3T2JqW1wiZGVmYXVsdFwiXSA9IG9iajsgaWYgKGNhY2hlKSB7IGNhY2hlLnNldChvYmosIG5ld09iaik7IH0gcmV0dXJuIG5ld09iajsgfVxuXG4vKipcclxuICogM3gzIE1hdHJpeFxyXG4gKiBAbW9kdWxlIG1hdDNcclxuICovXG5cbi8qKlxyXG4gKiBDcmVhdGVzIGEgbmV3IGlkZW50aXR5IG1hdDNcclxuICpcclxuICogQHJldHVybnMge21hdDN9IGEgbmV3IDN4MyBtYXRyaXhcclxuICovXG5mdW5jdGlvbiBjcmVhdGUoKSB7XG4gIHZhciBvdXQgPSBuZXcgZ2xNYXRyaXguQVJSQVlfVFlQRSg5KTtcblxuICBpZiAoZ2xNYXRyaXguQVJSQVlfVFlQRSAhPSBGbG9hdDMyQXJyYXkpIHtcbiAgICBvdXRbMV0gPSAwO1xuICAgIG91dFsyXSA9IDA7XG4gICAgb3V0WzNdID0gMDtcbiAgICBvdXRbNV0gPSAwO1xuICAgIG91dFs2XSA9IDA7XG4gICAgb3V0WzddID0gMDtcbiAgfVxuXG4gIG91dFswXSA9IDE7XG4gIG91dFs0XSA9IDE7XG4gIG91dFs4XSA9IDE7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogQ29waWVzIHRoZSB1cHBlci1sZWZ0IDN4MyB2YWx1ZXMgaW50byB0aGUgZ2l2ZW4gbWF0My5cclxuICpcclxuICogQHBhcmFtIHttYXQzfSBvdXQgdGhlIHJlY2VpdmluZyAzeDMgbWF0cml4XHJcbiAqIEBwYXJhbSB7bWF0NH0gYSAgIHRoZSBzb3VyY2UgNHg0IG1hdHJpeFxyXG4gKiBAcmV0dXJucyB7bWF0M30gb3V0XHJcbiAqL1xuXG5cbmZ1bmN0aW9uIGZyb21NYXQ0KG91dCwgYSkge1xuICBvdXRbMF0gPSBhWzBdO1xuICBvdXRbMV0gPSBhWzFdO1xuICBvdXRbMl0gPSBhWzJdO1xuICBvdXRbM10gPSBhWzRdO1xuICBvdXRbNF0gPSBhWzVdO1xuICBvdXRbNV0gPSBhWzZdO1xuICBvdXRbNl0gPSBhWzhdO1xuICBvdXRbN10gPSBhWzldO1xuICBvdXRbOF0gPSBhWzEwXTtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBDcmVhdGVzIGEgbmV3IG1hdDMgaW5pdGlhbGl6ZWQgd2l0aCB2YWx1ZXMgZnJvbSBhbiBleGlzdGluZyBtYXRyaXhcclxuICpcclxuICogQHBhcmFtIHttYXQzfSBhIG1hdHJpeCB0byBjbG9uZVxyXG4gKiBAcmV0dXJucyB7bWF0M30gYSBuZXcgM3gzIG1hdHJpeFxyXG4gKi9cblxuXG5mdW5jdGlvbiBjbG9uZShhKSB7XG4gIHZhciBvdXQgPSBuZXcgZ2xNYXRyaXguQVJSQVlfVFlQRSg5KTtcbiAgb3V0WzBdID0gYVswXTtcbiAgb3V0WzFdID0gYVsxXTtcbiAgb3V0WzJdID0gYVsyXTtcbiAgb3V0WzNdID0gYVszXTtcbiAgb3V0WzRdID0gYVs0XTtcbiAgb3V0WzVdID0gYVs1XTtcbiAgb3V0WzZdID0gYVs2XTtcbiAgb3V0WzddID0gYVs3XTtcbiAgb3V0WzhdID0gYVs4XTtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBDb3B5IHRoZSB2YWx1ZXMgZnJvbSBvbmUgbWF0MyB0byBhbm90aGVyXHJcbiAqXHJcbiAqIEBwYXJhbSB7bWF0M30gb3V0IHRoZSByZWNlaXZpbmcgbWF0cml4XHJcbiAqIEBwYXJhbSB7bWF0M30gYSB0aGUgc291cmNlIG1hdHJpeFxyXG4gKiBAcmV0dXJucyB7bWF0M30gb3V0XHJcbiAqL1xuXG5cbmZ1bmN0aW9uIGNvcHkob3V0LCBhKSB7XG4gIG91dFswXSA9IGFbMF07XG4gIG91dFsxXSA9IGFbMV07XG4gIG91dFsyXSA9IGFbMl07XG4gIG91dFszXSA9IGFbM107XG4gIG91dFs0XSA9IGFbNF07XG4gIG91dFs1XSA9IGFbNV07XG4gIG91dFs2XSA9IGFbNl07XG4gIG91dFs3XSA9IGFbN107XG4gIG91dFs4XSA9IGFbOF07XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogQ3JlYXRlIGEgbmV3IG1hdDMgd2l0aCB0aGUgZ2l2ZW4gdmFsdWVzXHJcbiAqXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBtMDAgQ29tcG9uZW50IGluIGNvbHVtbiAwLCByb3cgMCBwb3NpdGlvbiAoaW5kZXggMClcclxuICogQHBhcmFtIHtOdW1iZXJ9IG0wMSBDb21wb25lbnQgaW4gY29sdW1uIDAsIHJvdyAxIHBvc2l0aW9uIChpbmRleCAxKVxyXG4gKiBAcGFyYW0ge051bWJlcn0gbTAyIENvbXBvbmVudCBpbiBjb2x1bW4gMCwgcm93IDIgcG9zaXRpb24gKGluZGV4IDIpXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBtMTAgQ29tcG9uZW50IGluIGNvbHVtbiAxLCByb3cgMCBwb3NpdGlvbiAoaW5kZXggMylcclxuICogQHBhcmFtIHtOdW1iZXJ9IG0xMSBDb21wb25lbnQgaW4gY29sdW1uIDEsIHJvdyAxIHBvc2l0aW9uIChpbmRleCA0KVxyXG4gKiBAcGFyYW0ge051bWJlcn0gbTEyIENvbXBvbmVudCBpbiBjb2x1bW4gMSwgcm93IDIgcG9zaXRpb24gKGluZGV4IDUpXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBtMjAgQ29tcG9uZW50IGluIGNvbHVtbiAyLCByb3cgMCBwb3NpdGlvbiAoaW5kZXggNilcclxuICogQHBhcmFtIHtOdW1iZXJ9IG0yMSBDb21wb25lbnQgaW4gY29sdW1uIDIsIHJvdyAxIHBvc2l0aW9uIChpbmRleCA3KVxyXG4gKiBAcGFyYW0ge051bWJlcn0gbTIyIENvbXBvbmVudCBpbiBjb2x1bW4gMiwgcm93IDIgcG9zaXRpb24gKGluZGV4IDgpXHJcbiAqIEByZXR1cm5zIHttYXQzfSBBIG5ldyBtYXQzXHJcbiAqL1xuXG5cbmZ1bmN0aW9uIGZyb21WYWx1ZXMobTAwLCBtMDEsIG0wMiwgbTEwLCBtMTEsIG0xMiwgbTIwLCBtMjEsIG0yMikge1xuICB2YXIgb3V0ID0gbmV3IGdsTWF0cml4LkFSUkFZX1RZUEUoOSk7XG4gIG91dFswXSA9IG0wMDtcbiAgb3V0WzFdID0gbTAxO1xuICBvdXRbMl0gPSBtMDI7XG4gIG91dFszXSA9IG0xMDtcbiAgb3V0WzRdID0gbTExO1xuICBvdXRbNV0gPSBtMTI7XG4gIG91dFs2XSA9IG0yMDtcbiAgb3V0WzddID0gbTIxO1xuICBvdXRbOF0gPSBtMjI7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogU2V0IHRoZSBjb21wb25lbnRzIG9mIGEgbWF0MyB0byB0aGUgZ2l2ZW4gdmFsdWVzXHJcbiAqXHJcbiAqIEBwYXJhbSB7bWF0M30gb3V0IHRoZSByZWNlaXZpbmcgbWF0cml4XHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBtMDAgQ29tcG9uZW50IGluIGNvbHVtbiAwLCByb3cgMCBwb3NpdGlvbiAoaW5kZXggMClcclxuICogQHBhcmFtIHtOdW1iZXJ9IG0wMSBDb21wb25lbnQgaW4gY29sdW1uIDAsIHJvdyAxIHBvc2l0aW9uIChpbmRleCAxKVxyXG4gKiBAcGFyYW0ge051bWJlcn0gbTAyIENvbXBvbmVudCBpbiBjb2x1bW4gMCwgcm93IDIgcG9zaXRpb24gKGluZGV4IDIpXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBtMTAgQ29tcG9uZW50IGluIGNvbHVtbiAxLCByb3cgMCBwb3NpdGlvbiAoaW5kZXggMylcclxuICogQHBhcmFtIHtOdW1iZXJ9IG0xMSBDb21wb25lbnQgaW4gY29sdW1uIDEsIHJvdyAxIHBvc2l0aW9uIChpbmRleCA0KVxyXG4gKiBAcGFyYW0ge051bWJlcn0gbTEyIENvbXBvbmVudCBpbiBjb2x1bW4gMSwgcm93IDIgcG9zaXRpb24gKGluZGV4IDUpXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBtMjAgQ29tcG9uZW50IGluIGNvbHVtbiAyLCByb3cgMCBwb3NpdGlvbiAoaW5kZXggNilcclxuICogQHBhcmFtIHtOdW1iZXJ9IG0yMSBDb21wb25lbnQgaW4gY29sdW1uIDIsIHJvdyAxIHBvc2l0aW9uIChpbmRleCA3KVxyXG4gKiBAcGFyYW0ge051bWJlcn0gbTIyIENvbXBvbmVudCBpbiBjb2x1bW4gMiwgcm93IDIgcG9zaXRpb24gKGluZGV4IDgpXHJcbiAqIEByZXR1cm5zIHttYXQzfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gc2V0KG91dCwgbTAwLCBtMDEsIG0wMiwgbTEwLCBtMTEsIG0xMiwgbTIwLCBtMjEsIG0yMikge1xuICBvdXRbMF0gPSBtMDA7XG4gIG91dFsxXSA9IG0wMTtcbiAgb3V0WzJdID0gbTAyO1xuICBvdXRbM10gPSBtMTA7XG4gIG91dFs0XSA9IG0xMTtcbiAgb3V0WzVdID0gbTEyO1xuICBvdXRbNl0gPSBtMjA7XG4gIG91dFs3XSA9IG0yMTtcbiAgb3V0WzhdID0gbTIyO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIFNldCBhIG1hdDMgdG8gdGhlIGlkZW50aXR5IG1hdHJpeFxyXG4gKlxyXG4gKiBAcGFyYW0ge21hdDN9IG91dCB0aGUgcmVjZWl2aW5nIG1hdHJpeFxyXG4gKiBAcmV0dXJucyB7bWF0M30gb3V0XHJcbiAqL1xuXG5cbmZ1bmN0aW9uIGlkZW50aXR5KG91dCkge1xuICBvdXRbMF0gPSAxO1xuICBvdXRbMV0gPSAwO1xuICBvdXRbMl0gPSAwO1xuICBvdXRbM10gPSAwO1xuICBvdXRbNF0gPSAxO1xuICBvdXRbNV0gPSAwO1xuICBvdXRbNl0gPSAwO1xuICBvdXRbN10gPSAwO1xuICBvdXRbOF0gPSAxO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIFRyYW5zcG9zZSB0aGUgdmFsdWVzIG9mIGEgbWF0M1xyXG4gKlxyXG4gKiBAcGFyYW0ge21hdDN9IG91dCB0aGUgcmVjZWl2aW5nIG1hdHJpeFxyXG4gKiBAcGFyYW0ge21hdDN9IGEgdGhlIHNvdXJjZSBtYXRyaXhcclxuICogQHJldHVybnMge21hdDN9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiB0cmFuc3Bvc2Uob3V0LCBhKSB7XG4gIC8vIElmIHdlIGFyZSB0cmFuc3Bvc2luZyBvdXJzZWx2ZXMgd2UgY2FuIHNraXAgYSBmZXcgc3RlcHMgYnV0IGhhdmUgdG8gY2FjaGUgc29tZSB2YWx1ZXNcbiAgaWYgKG91dCA9PT0gYSkge1xuICAgIHZhciBhMDEgPSBhWzFdLFxuICAgICAgICBhMDIgPSBhWzJdLFxuICAgICAgICBhMTIgPSBhWzVdO1xuICAgIG91dFsxXSA9IGFbM107XG4gICAgb3V0WzJdID0gYVs2XTtcbiAgICBvdXRbM10gPSBhMDE7XG4gICAgb3V0WzVdID0gYVs3XTtcbiAgICBvdXRbNl0gPSBhMDI7XG4gICAgb3V0WzddID0gYTEyO1xuICB9IGVsc2Uge1xuICAgIG91dFswXSA9IGFbMF07XG4gICAgb3V0WzFdID0gYVszXTtcbiAgICBvdXRbMl0gPSBhWzZdO1xuICAgIG91dFszXSA9IGFbMV07XG4gICAgb3V0WzRdID0gYVs0XTtcbiAgICBvdXRbNV0gPSBhWzddO1xuICAgIG91dFs2XSA9IGFbMl07XG4gICAgb3V0WzddID0gYVs1XTtcbiAgICBvdXRbOF0gPSBhWzhdO1xuICB9XG5cbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBJbnZlcnRzIGEgbWF0M1xyXG4gKlxyXG4gKiBAcGFyYW0ge21hdDN9IG91dCB0aGUgcmVjZWl2aW5nIG1hdHJpeFxyXG4gKiBAcGFyYW0ge21hdDN9IGEgdGhlIHNvdXJjZSBtYXRyaXhcclxuICogQHJldHVybnMge21hdDN9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBpbnZlcnQob3V0LCBhKSB7XG4gIHZhciBhMDAgPSBhWzBdLFxuICAgICAgYTAxID0gYVsxXSxcbiAgICAgIGEwMiA9IGFbMl07XG4gIHZhciBhMTAgPSBhWzNdLFxuICAgICAgYTExID0gYVs0XSxcbiAgICAgIGExMiA9IGFbNV07XG4gIHZhciBhMjAgPSBhWzZdLFxuICAgICAgYTIxID0gYVs3XSxcbiAgICAgIGEyMiA9IGFbOF07XG4gIHZhciBiMDEgPSBhMjIgKiBhMTEgLSBhMTIgKiBhMjE7XG4gIHZhciBiMTEgPSAtYTIyICogYTEwICsgYTEyICogYTIwO1xuICB2YXIgYjIxID0gYTIxICogYTEwIC0gYTExICogYTIwOyAvLyBDYWxjdWxhdGUgdGhlIGRldGVybWluYW50XG5cbiAgdmFyIGRldCA9IGEwMCAqIGIwMSArIGEwMSAqIGIxMSArIGEwMiAqIGIyMTtcblxuICBpZiAoIWRldCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgZGV0ID0gMS4wIC8gZGV0O1xuICBvdXRbMF0gPSBiMDEgKiBkZXQ7XG4gIG91dFsxXSA9ICgtYTIyICogYTAxICsgYTAyICogYTIxKSAqIGRldDtcbiAgb3V0WzJdID0gKGExMiAqIGEwMSAtIGEwMiAqIGExMSkgKiBkZXQ7XG4gIG91dFszXSA9IGIxMSAqIGRldDtcbiAgb3V0WzRdID0gKGEyMiAqIGEwMCAtIGEwMiAqIGEyMCkgKiBkZXQ7XG4gIG91dFs1XSA9ICgtYTEyICogYTAwICsgYTAyICogYTEwKSAqIGRldDtcbiAgb3V0WzZdID0gYjIxICogZGV0O1xuICBvdXRbN10gPSAoLWEyMSAqIGEwMCArIGEwMSAqIGEyMCkgKiBkZXQ7XG4gIG91dFs4XSA9IChhMTEgKiBhMDAgLSBhMDEgKiBhMTApICogZGV0O1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIENhbGN1bGF0ZXMgdGhlIGFkanVnYXRlIG9mIGEgbWF0M1xyXG4gKlxyXG4gKiBAcGFyYW0ge21hdDN9IG91dCB0aGUgcmVjZWl2aW5nIG1hdHJpeFxyXG4gKiBAcGFyYW0ge21hdDN9IGEgdGhlIHNvdXJjZSBtYXRyaXhcclxuICogQHJldHVybnMge21hdDN9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBhZGpvaW50KG91dCwgYSkge1xuICB2YXIgYTAwID0gYVswXSxcbiAgICAgIGEwMSA9IGFbMV0sXG4gICAgICBhMDIgPSBhWzJdO1xuICB2YXIgYTEwID0gYVszXSxcbiAgICAgIGExMSA9IGFbNF0sXG4gICAgICBhMTIgPSBhWzVdO1xuICB2YXIgYTIwID0gYVs2XSxcbiAgICAgIGEyMSA9IGFbN10sXG4gICAgICBhMjIgPSBhWzhdO1xuICBvdXRbMF0gPSBhMTEgKiBhMjIgLSBhMTIgKiBhMjE7XG4gIG91dFsxXSA9IGEwMiAqIGEyMSAtIGEwMSAqIGEyMjtcbiAgb3V0WzJdID0gYTAxICogYTEyIC0gYTAyICogYTExO1xuICBvdXRbM10gPSBhMTIgKiBhMjAgLSBhMTAgKiBhMjI7XG4gIG91dFs0XSA9IGEwMCAqIGEyMiAtIGEwMiAqIGEyMDtcbiAgb3V0WzVdID0gYTAyICogYTEwIC0gYTAwICogYTEyO1xuICBvdXRbNl0gPSBhMTAgKiBhMjEgLSBhMTEgKiBhMjA7XG4gIG91dFs3XSA9IGEwMSAqIGEyMCAtIGEwMCAqIGEyMTtcbiAgb3V0WzhdID0gYTAwICogYTExIC0gYTAxICogYTEwO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIENhbGN1bGF0ZXMgdGhlIGRldGVybWluYW50IG9mIGEgbWF0M1xyXG4gKlxyXG4gKiBAcGFyYW0ge21hdDN9IGEgdGhlIHNvdXJjZSBtYXRyaXhcclxuICogQHJldHVybnMge051bWJlcn0gZGV0ZXJtaW5hbnQgb2YgYVxyXG4gKi9cblxuXG5mdW5jdGlvbiBkZXRlcm1pbmFudChhKSB7XG4gIHZhciBhMDAgPSBhWzBdLFxuICAgICAgYTAxID0gYVsxXSxcbiAgICAgIGEwMiA9IGFbMl07XG4gIHZhciBhMTAgPSBhWzNdLFxuICAgICAgYTExID0gYVs0XSxcbiAgICAgIGExMiA9IGFbNV07XG4gIHZhciBhMjAgPSBhWzZdLFxuICAgICAgYTIxID0gYVs3XSxcbiAgICAgIGEyMiA9IGFbOF07XG4gIHJldHVybiBhMDAgKiAoYTIyICogYTExIC0gYTEyICogYTIxKSArIGEwMSAqICgtYTIyICogYTEwICsgYTEyICogYTIwKSArIGEwMiAqIChhMjEgKiBhMTAgLSBhMTEgKiBhMjApO1xufVxuLyoqXHJcbiAqIE11bHRpcGxpZXMgdHdvIG1hdDMnc1xyXG4gKlxyXG4gKiBAcGFyYW0ge21hdDN9IG91dCB0aGUgcmVjZWl2aW5nIG1hdHJpeFxyXG4gKiBAcGFyYW0ge21hdDN9IGEgdGhlIGZpcnN0IG9wZXJhbmRcclxuICogQHBhcmFtIHttYXQzfSBiIHRoZSBzZWNvbmQgb3BlcmFuZFxyXG4gKiBAcmV0dXJucyB7bWF0M30gb3V0XHJcbiAqL1xuXG5cbmZ1bmN0aW9uIG11bHRpcGx5KG91dCwgYSwgYikge1xuICB2YXIgYTAwID0gYVswXSxcbiAgICAgIGEwMSA9IGFbMV0sXG4gICAgICBhMDIgPSBhWzJdO1xuICB2YXIgYTEwID0gYVszXSxcbiAgICAgIGExMSA9IGFbNF0sXG4gICAgICBhMTIgPSBhWzVdO1xuICB2YXIgYTIwID0gYVs2XSxcbiAgICAgIGEyMSA9IGFbN10sXG4gICAgICBhMjIgPSBhWzhdO1xuICB2YXIgYjAwID0gYlswXSxcbiAgICAgIGIwMSA9IGJbMV0sXG4gICAgICBiMDIgPSBiWzJdO1xuICB2YXIgYjEwID0gYlszXSxcbiAgICAgIGIxMSA9IGJbNF0sXG4gICAgICBiMTIgPSBiWzVdO1xuICB2YXIgYjIwID0gYls2XSxcbiAgICAgIGIyMSA9IGJbN10sXG4gICAgICBiMjIgPSBiWzhdO1xuICBvdXRbMF0gPSBiMDAgKiBhMDAgKyBiMDEgKiBhMTAgKyBiMDIgKiBhMjA7XG4gIG91dFsxXSA9IGIwMCAqIGEwMSArIGIwMSAqIGExMSArIGIwMiAqIGEyMTtcbiAgb3V0WzJdID0gYjAwICogYTAyICsgYjAxICogYTEyICsgYjAyICogYTIyO1xuICBvdXRbM10gPSBiMTAgKiBhMDAgKyBiMTEgKiBhMTAgKyBiMTIgKiBhMjA7XG4gIG91dFs0XSA9IGIxMCAqIGEwMSArIGIxMSAqIGExMSArIGIxMiAqIGEyMTtcbiAgb3V0WzVdID0gYjEwICogYTAyICsgYjExICogYTEyICsgYjEyICogYTIyO1xuICBvdXRbNl0gPSBiMjAgKiBhMDAgKyBiMjEgKiBhMTAgKyBiMjIgKiBhMjA7XG4gIG91dFs3XSA9IGIyMCAqIGEwMSArIGIyMSAqIGExMSArIGIyMiAqIGEyMTtcbiAgb3V0WzhdID0gYjIwICogYTAyICsgYjIxICogYTEyICsgYjIyICogYTIyO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIFRyYW5zbGF0ZSBhIG1hdDMgYnkgdGhlIGdpdmVuIHZlY3RvclxyXG4gKlxyXG4gKiBAcGFyYW0ge21hdDN9IG91dCB0aGUgcmVjZWl2aW5nIG1hdHJpeFxyXG4gKiBAcGFyYW0ge21hdDN9IGEgdGhlIG1hdHJpeCB0byB0cmFuc2xhdGVcclxuICogQHBhcmFtIHt2ZWMyfSB2IHZlY3RvciB0byB0cmFuc2xhdGUgYnlcclxuICogQHJldHVybnMge21hdDN9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiB0cmFuc2xhdGUob3V0LCBhLCB2KSB7XG4gIHZhciBhMDAgPSBhWzBdLFxuICAgICAgYTAxID0gYVsxXSxcbiAgICAgIGEwMiA9IGFbMl0sXG4gICAgICBhMTAgPSBhWzNdLFxuICAgICAgYTExID0gYVs0XSxcbiAgICAgIGExMiA9IGFbNV0sXG4gICAgICBhMjAgPSBhWzZdLFxuICAgICAgYTIxID0gYVs3XSxcbiAgICAgIGEyMiA9IGFbOF0sXG4gICAgICB4ID0gdlswXSxcbiAgICAgIHkgPSB2WzFdO1xuICBvdXRbMF0gPSBhMDA7XG4gIG91dFsxXSA9IGEwMTtcbiAgb3V0WzJdID0gYTAyO1xuICBvdXRbM10gPSBhMTA7XG4gIG91dFs0XSA9IGExMTtcbiAgb3V0WzVdID0gYTEyO1xuICBvdXRbNl0gPSB4ICogYTAwICsgeSAqIGExMCArIGEyMDtcbiAgb3V0WzddID0geCAqIGEwMSArIHkgKiBhMTEgKyBhMjE7XG4gIG91dFs4XSA9IHggKiBhMDIgKyB5ICogYTEyICsgYTIyO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIFJvdGF0ZXMgYSBtYXQzIGJ5IHRoZSBnaXZlbiBhbmdsZVxyXG4gKlxyXG4gKiBAcGFyYW0ge21hdDN9IG91dCB0aGUgcmVjZWl2aW5nIG1hdHJpeFxyXG4gKiBAcGFyYW0ge21hdDN9IGEgdGhlIG1hdHJpeCB0byByb3RhdGVcclxuICogQHBhcmFtIHtOdW1iZXJ9IHJhZCB0aGUgYW5nbGUgdG8gcm90YXRlIHRoZSBtYXRyaXggYnlcclxuICogQHJldHVybnMge21hdDN9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiByb3RhdGUob3V0LCBhLCByYWQpIHtcbiAgdmFyIGEwMCA9IGFbMF0sXG4gICAgICBhMDEgPSBhWzFdLFxuICAgICAgYTAyID0gYVsyXSxcbiAgICAgIGExMCA9IGFbM10sXG4gICAgICBhMTEgPSBhWzRdLFxuICAgICAgYTEyID0gYVs1XSxcbiAgICAgIGEyMCA9IGFbNl0sXG4gICAgICBhMjEgPSBhWzddLFxuICAgICAgYTIyID0gYVs4XSxcbiAgICAgIHMgPSBNYXRoLnNpbihyYWQpLFxuICAgICAgYyA9IE1hdGguY29zKHJhZCk7XG4gIG91dFswXSA9IGMgKiBhMDAgKyBzICogYTEwO1xuICBvdXRbMV0gPSBjICogYTAxICsgcyAqIGExMTtcbiAgb3V0WzJdID0gYyAqIGEwMiArIHMgKiBhMTI7XG4gIG91dFszXSA9IGMgKiBhMTAgLSBzICogYTAwO1xuICBvdXRbNF0gPSBjICogYTExIC0gcyAqIGEwMTtcbiAgb3V0WzVdID0gYyAqIGExMiAtIHMgKiBhMDI7XG4gIG91dFs2XSA9IGEyMDtcbiAgb3V0WzddID0gYTIxO1xuICBvdXRbOF0gPSBhMjI7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogU2NhbGVzIHRoZSBtYXQzIGJ5IHRoZSBkaW1lbnNpb25zIGluIHRoZSBnaXZlbiB2ZWMyXHJcbiAqXHJcbiAqIEBwYXJhbSB7bWF0M30gb3V0IHRoZSByZWNlaXZpbmcgbWF0cml4XHJcbiAqIEBwYXJhbSB7bWF0M30gYSB0aGUgbWF0cml4IHRvIHJvdGF0ZVxyXG4gKiBAcGFyYW0ge3ZlYzJ9IHYgdGhlIHZlYzIgdG8gc2NhbGUgdGhlIG1hdHJpeCBieVxyXG4gKiBAcmV0dXJucyB7bWF0M30gb3V0XHJcbiAqKi9cblxuXG5mdW5jdGlvbiBzY2FsZShvdXQsIGEsIHYpIHtcbiAgdmFyIHggPSB2WzBdLFxuICAgICAgeSA9IHZbMV07XG4gIG91dFswXSA9IHggKiBhWzBdO1xuICBvdXRbMV0gPSB4ICogYVsxXTtcbiAgb3V0WzJdID0geCAqIGFbMl07XG4gIG91dFszXSA9IHkgKiBhWzNdO1xuICBvdXRbNF0gPSB5ICogYVs0XTtcbiAgb3V0WzVdID0geSAqIGFbNV07XG4gIG91dFs2XSA9IGFbNl07XG4gIG91dFs3XSA9IGFbN107XG4gIG91dFs4XSA9IGFbOF07XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogQ3JlYXRlcyBhIG1hdHJpeCBmcm9tIGEgdmVjdG9yIHRyYW5zbGF0aW9uXHJcbiAqIFRoaXMgaXMgZXF1aXZhbGVudCB0byAoYnV0IG11Y2ggZmFzdGVyIHRoYW4pOlxyXG4gKlxyXG4gKiAgICAgbWF0My5pZGVudGl0eShkZXN0KTtcclxuICogICAgIG1hdDMudHJhbnNsYXRlKGRlc3QsIGRlc3QsIHZlYyk7XHJcbiAqXHJcbiAqIEBwYXJhbSB7bWF0M30gb3V0IG1hdDMgcmVjZWl2aW5nIG9wZXJhdGlvbiByZXN1bHRcclxuICogQHBhcmFtIHt2ZWMyfSB2IFRyYW5zbGF0aW9uIHZlY3RvclxyXG4gKiBAcmV0dXJucyB7bWF0M30gb3V0XHJcbiAqL1xuXG5cbmZ1bmN0aW9uIGZyb21UcmFuc2xhdGlvbihvdXQsIHYpIHtcbiAgb3V0WzBdID0gMTtcbiAgb3V0WzFdID0gMDtcbiAgb3V0WzJdID0gMDtcbiAgb3V0WzNdID0gMDtcbiAgb3V0WzRdID0gMTtcbiAgb3V0WzVdID0gMDtcbiAgb3V0WzZdID0gdlswXTtcbiAgb3V0WzddID0gdlsxXTtcbiAgb3V0WzhdID0gMTtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBDcmVhdGVzIGEgbWF0cml4IGZyb20gYSBnaXZlbiBhbmdsZVxyXG4gKiBUaGlzIGlzIGVxdWl2YWxlbnQgdG8gKGJ1dCBtdWNoIGZhc3RlciB0aGFuKTpcclxuICpcclxuICogICAgIG1hdDMuaWRlbnRpdHkoZGVzdCk7XHJcbiAqICAgICBtYXQzLnJvdGF0ZShkZXN0LCBkZXN0LCByYWQpO1xyXG4gKlxyXG4gKiBAcGFyYW0ge21hdDN9IG91dCBtYXQzIHJlY2VpdmluZyBvcGVyYXRpb24gcmVzdWx0XHJcbiAqIEBwYXJhbSB7TnVtYmVyfSByYWQgdGhlIGFuZ2xlIHRvIHJvdGF0ZSB0aGUgbWF0cml4IGJ5XHJcbiAqIEByZXR1cm5zIHttYXQzfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gZnJvbVJvdGF0aW9uKG91dCwgcmFkKSB7XG4gIHZhciBzID0gTWF0aC5zaW4ocmFkKSxcbiAgICAgIGMgPSBNYXRoLmNvcyhyYWQpO1xuICBvdXRbMF0gPSBjO1xuICBvdXRbMV0gPSBzO1xuICBvdXRbMl0gPSAwO1xuICBvdXRbM10gPSAtcztcbiAgb3V0WzRdID0gYztcbiAgb3V0WzVdID0gMDtcbiAgb3V0WzZdID0gMDtcbiAgb3V0WzddID0gMDtcbiAgb3V0WzhdID0gMTtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBDcmVhdGVzIGEgbWF0cml4IGZyb20gYSB2ZWN0b3Igc2NhbGluZ1xyXG4gKiBUaGlzIGlzIGVxdWl2YWxlbnQgdG8gKGJ1dCBtdWNoIGZhc3RlciB0aGFuKTpcclxuICpcclxuICogICAgIG1hdDMuaWRlbnRpdHkoZGVzdCk7XHJcbiAqICAgICBtYXQzLnNjYWxlKGRlc3QsIGRlc3QsIHZlYyk7XHJcbiAqXHJcbiAqIEBwYXJhbSB7bWF0M30gb3V0IG1hdDMgcmVjZWl2aW5nIG9wZXJhdGlvbiByZXN1bHRcclxuICogQHBhcmFtIHt2ZWMyfSB2IFNjYWxpbmcgdmVjdG9yXHJcbiAqIEByZXR1cm5zIHttYXQzfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gZnJvbVNjYWxpbmcob3V0LCB2KSB7XG4gIG91dFswXSA9IHZbMF07XG4gIG91dFsxXSA9IDA7XG4gIG91dFsyXSA9IDA7XG4gIG91dFszXSA9IDA7XG4gIG91dFs0XSA9IHZbMV07XG4gIG91dFs1XSA9IDA7XG4gIG91dFs2XSA9IDA7XG4gIG91dFs3XSA9IDA7XG4gIG91dFs4XSA9IDE7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogQ29waWVzIHRoZSB2YWx1ZXMgZnJvbSBhIG1hdDJkIGludG8gYSBtYXQzXHJcbiAqXHJcbiAqIEBwYXJhbSB7bWF0M30gb3V0IHRoZSByZWNlaXZpbmcgbWF0cml4XHJcbiAqIEBwYXJhbSB7bWF0MmR9IGEgdGhlIG1hdHJpeCB0byBjb3B5XHJcbiAqIEByZXR1cm5zIHttYXQzfSBvdXRcclxuICoqL1xuXG5cbmZ1bmN0aW9uIGZyb21NYXQyZChvdXQsIGEpIHtcbiAgb3V0WzBdID0gYVswXTtcbiAgb3V0WzFdID0gYVsxXTtcbiAgb3V0WzJdID0gMDtcbiAgb3V0WzNdID0gYVsyXTtcbiAgb3V0WzRdID0gYVszXTtcbiAgb3V0WzVdID0gMDtcbiAgb3V0WzZdID0gYVs0XTtcbiAgb3V0WzddID0gYVs1XTtcbiAgb3V0WzhdID0gMTtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBDYWxjdWxhdGVzIGEgM3gzIG1hdHJpeCBmcm9tIHRoZSBnaXZlbiBxdWF0ZXJuaW9uXHJcbiAqXHJcbiAqIEBwYXJhbSB7bWF0M30gb3V0IG1hdDMgcmVjZWl2aW5nIG9wZXJhdGlvbiByZXN1bHRcclxuICogQHBhcmFtIHtxdWF0fSBxIFF1YXRlcm5pb24gdG8gY3JlYXRlIG1hdHJpeCBmcm9tXHJcbiAqXHJcbiAqIEByZXR1cm5zIHttYXQzfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gZnJvbVF1YXQob3V0LCBxKSB7XG4gIHZhciB4ID0gcVswXSxcbiAgICAgIHkgPSBxWzFdLFxuICAgICAgeiA9IHFbMl0sXG4gICAgICB3ID0gcVszXTtcbiAgdmFyIHgyID0geCArIHg7XG4gIHZhciB5MiA9IHkgKyB5O1xuICB2YXIgejIgPSB6ICsgejtcbiAgdmFyIHh4ID0geCAqIHgyO1xuICB2YXIgeXggPSB5ICogeDI7XG4gIHZhciB5eSA9IHkgKiB5MjtcbiAgdmFyIHp4ID0geiAqIHgyO1xuICB2YXIgenkgPSB6ICogeTI7XG4gIHZhciB6eiA9IHogKiB6MjtcbiAgdmFyIHd4ID0gdyAqIHgyO1xuICB2YXIgd3kgPSB3ICogeTI7XG4gIHZhciB3eiA9IHcgKiB6MjtcbiAgb3V0WzBdID0gMSAtIHl5IC0geno7XG4gIG91dFszXSA9IHl4IC0gd3o7XG4gIG91dFs2XSA9IHp4ICsgd3k7XG4gIG91dFsxXSA9IHl4ICsgd3o7XG4gIG91dFs0XSA9IDEgLSB4eCAtIHp6O1xuICBvdXRbN10gPSB6eSAtIHd4O1xuICBvdXRbMl0gPSB6eCAtIHd5O1xuICBvdXRbNV0gPSB6eSArIHd4O1xuICBvdXRbOF0gPSAxIC0geHggLSB5eTtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBDYWxjdWxhdGVzIGEgM3gzIG5vcm1hbCBtYXRyaXggKHRyYW5zcG9zZSBpbnZlcnNlKSBmcm9tIHRoZSA0eDQgbWF0cml4XHJcbiAqXHJcbiAqIEBwYXJhbSB7bWF0M30gb3V0IG1hdDMgcmVjZWl2aW5nIG9wZXJhdGlvbiByZXN1bHRcclxuICogQHBhcmFtIHttYXQ0fSBhIE1hdDQgdG8gZGVyaXZlIHRoZSBub3JtYWwgbWF0cml4IGZyb21cclxuICpcclxuICogQHJldHVybnMge21hdDN9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBub3JtYWxGcm9tTWF0NChvdXQsIGEpIHtcbiAgdmFyIGEwMCA9IGFbMF0sXG4gICAgICBhMDEgPSBhWzFdLFxuICAgICAgYTAyID0gYVsyXSxcbiAgICAgIGEwMyA9IGFbM107XG4gIHZhciBhMTAgPSBhWzRdLFxuICAgICAgYTExID0gYVs1XSxcbiAgICAgIGExMiA9IGFbNl0sXG4gICAgICBhMTMgPSBhWzddO1xuICB2YXIgYTIwID0gYVs4XSxcbiAgICAgIGEyMSA9IGFbOV0sXG4gICAgICBhMjIgPSBhWzEwXSxcbiAgICAgIGEyMyA9IGFbMTFdO1xuICB2YXIgYTMwID0gYVsxMl0sXG4gICAgICBhMzEgPSBhWzEzXSxcbiAgICAgIGEzMiA9IGFbMTRdLFxuICAgICAgYTMzID0gYVsxNV07XG4gIHZhciBiMDAgPSBhMDAgKiBhMTEgLSBhMDEgKiBhMTA7XG4gIHZhciBiMDEgPSBhMDAgKiBhMTIgLSBhMDIgKiBhMTA7XG4gIHZhciBiMDIgPSBhMDAgKiBhMTMgLSBhMDMgKiBhMTA7XG4gIHZhciBiMDMgPSBhMDEgKiBhMTIgLSBhMDIgKiBhMTE7XG4gIHZhciBiMDQgPSBhMDEgKiBhMTMgLSBhMDMgKiBhMTE7XG4gIHZhciBiMDUgPSBhMDIgKiBhMTMgLSBhMDMgKiBhMTI7XG4gIHZhciBiMDYgPSBhMjAgKiBhMzEgLSBhMjEgKiBhMzA7XG4gIHZhciBiMDcgPSBhMjAgKiBhMzIgLSBhMjIgKiBhMzA7XG4gIHZhciBiMDggPSBhMjAgKiBhMzMgLSBhMjMgKiBhMzA7XG4gIHZhciBiMDkgPSBhMjEgKiBhMzIgLSBhMjIgKiBhMzE7XG4gIHZhciBiMTAgPSBhMjEgKiBhMzMgLSBhMjMgKiBhMzE7XG4gIHZhciBiMTEgPSBhMjIgKiBhMzMgLSBhMjMgKiBhMzI7IC8vIENhbGN1bGF0ZSB0aGUgZGV0ZXJtaW5hbnRcblxuICB2YXIgZGV0ID0gYjAwICogYjExIC0gYjAxICogYjEwICsgYjAyICogYjA5ICsgYjAzICogYjA4IC0gYjA0ICogYjA3ICsgYjA1ICogYjA2O1xuXG4gIGlmICghZGV0KSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBkZXQgPSAxLjAgLyBkZXQ7XG4gIG91dFswXSA9IChhMTEgKiBiMTEgLSBhMTIgKiBiMTAgKyBhMTMgKiBiMDkpICogZGV0O1xuICBvdXRbMV0gPSAoYTEyICogYjA4IC0gYTEwICogYjExIC0gYTEzICogYjA3KSAqIGRldDtcbiAgb3V0WzJdID0gKGExMCAqIGIxMCAtIGExMSAqIGIwOCArIGExMyAqIGIwNikgKiBkZXQ7XG4gIG91dFszXSA9IChhMDIgKiBiMTAgLSBhMDEgKiBiMTEgLSBhMDMgKiBiMDkpICogZGV0O1xuICBvdXRbNF0gPSAoYTAwICogYjExIC0gYTAyICogYjA4ICsgYTAzICogYjA3KSAqIGRldDtcbiAgb3V0WzVdID0gKGEwMSAqIGIwOCAtIGEwMCAqIGIxMCAtIGEwMyAqIGIwNikgKiBkZXQ7XG4gIG91dFs2XSA9IChhMzEgKiBiMDUgLSBhMzIgKiBiMDQgKyBhMzMgKiBiMDMpICogZGV0O1xuICBvdXRbN10gPSAoYTMyICogYjAyIC0gYTMwICogYjA1IC0gYTMzICogYjAxKSAqIGRldDtcbiAgb3V0WzhdID0gKGEzMCAqIGIwNCAtIGEzMSAqIGIwMiArIGEzMyAqIGIwMCkgKiBkZXQ7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogR2VuZXJhdGVzIGEgMkQgcHJvamVjdGlvbiBtYXRyaXggd2l0aCB0aGUgZ2l2ZW4gYm91bmRzXHJcbiAqXHJcbiAqIEBwYXJhbSB7bWF0M30gb3V0IG1hdDMgZnJ1c3R1bSBtYXRyaXggd2lsbCBiZSB3cml0dGVuIGludG9cclxuICogQHBhcmFtIHtudW1iZXJ9IHdpZHRoIFdpZHRoIG9mIHlvdXIgZ2wgY29udGV4dFxyXG4gKiBAcGFyYW0ge251bWJlcn0gaGVpZ2h0IEhlaWdodCBvZiBnbCBjb250ZXh0XHJcbiAqIEByZXR1cm5zIHttYXQzfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gcHJvamVjdGlvbihvdXQsIHdpZHRoLCBoZWlnaHQpIHtcbiAgb3V0WzBdID0gMiAvIHdpZHRoO1xuICBvdXRbMV0gPSAwO1xuICBvdXRbMl0gPSAwO1xuICBvdXRbM10gPSAwO1xuICBvdXRbNF0gPSAtMiAvIGhlaWdodDtcbiAgb3V0WzVdID0gMDtcbiAgb3V0WzZdID0gLTE7XG4gIG91dFs3XSA9IDE7XG4gIG91dFs4XSA9IDE7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogUmV0dXJucyBhIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiBhIG1hdDNcclxuICpcclxuICogQHBhcmFtIHttYXQzfSBhIG1hdHJpeCB0byByZXByZXNlbnQgYXMgYSBzdHJpbmdcclxuICogQHJldHVybnMge1N0cmluZ30gc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBtYXRyaXhcclxuICovXG5cblxuZnVuY3Rpb24gc3RyKGEpIHtcbiAgcmV0dXJuIFwibWF0MyhcIiArIGFbMF0gKyBcIiwgXCIgKyBhWzFdICsgXCIsIFwiICsgYVsyXSArIFwiLCBcIiArIGFbM10gKyBcIiwgXCIgKyBhWzRdICsgXCIsIFwiICsgYVs1XSArIFwiLCBcIiArIGFbNl0gKyBcIiwgXCIgKyBhWzddICsgXCIsIFwiICsgYVs4XSArIFwiKVwiO1xufVxuLyoqXHJcbiAqIFJldHVybnMgRnJvYmVuaXVzIG5vcm0gb2YgYSBtYXQzXHJcbiAqXHJcbiAqIEBwYXJhbSB7bWF0M30gYSB0aGUgbWF0cml4IHRvIGNhbGN1bGF0ZSBGcm9iZW5pdXMgbm9ybSBvZlxyXG4gKiBAcmV0dXJucyB7TnVtYmVyfSBGcm9iZW5pdXMgbm9ybVxyXG4gKi9cblxuXG5mdW5jdGlvbiBmcm9iKGEpIHtcbiAgcmV0dXJuIE1hdGguaHlwb3QoYVswXSwgYVsxXSwgYVsyXSwgYVszXSwgYVs0XSwgYVs1XSwgYVs2XSwgYVs3XSwgYVs4XSk7XG59XG4vKipcclxuICogQWRkcyB0d28gbWF0MydzXHJcbiAqXHJcbiAqIEBwYXJhbSB7bWF0M30gb3V0IHRoZSByZWNlaXZpbmcgbWF0cml4XHJcbiAqIEBwYXJhbSB7bWF0M30gYSB0aGUgZmlyc3Qgb3BlcmFuZFxyXG4gKiBAcGFyYW0ge21hdDN9IGIgdGhlIHNlY29uZCBvcGVyYW5kXHJcbiAqIEByZXR1cm5zIHttYXQzfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gYWRkKG91dCwgYSwgYikge1xuICBvdXRbMF0gPSBhWzBdICsgYlswXTtcbiAgb3V0WzFdID0gYVsxXSArIGJbMV07XG4gIG91dFsyXSA9IGFbMl0gKyBiWzJdO1xuICBvdXRbM10gPSBhWzNdICsgYlszXTtcbiAgb3V0WzRdID0gYVs0XSArIGJbNF07XG4gIG91dFs1XSA9IGFbNV0gKyBiWzVdO1xuICBvdXRbNl0gPSBhWzZdICsgYls2XTtcbiAgb3V0WzddID0gYVs3XSArIGJbN107XG4gIG91dFs4XSA9IGFbOF0gKyBiWzhdO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIFN1YnRyYWN0cyBtYXRyaXggYiBmcm9tIG1hdHJpeCBhXHJcbiAqXHJcbiAqIEBwYXJhbSB7bWF0M30gb3V0IHRoZSByZWNlaXZpbmcgbWF0cml4XHJcbiAqIEBwYXJhbSB7bWF0M30gYSB0aGUgZmlyc3Qgb3BlcmFuZFxyXG4gKiBAcGFyYW0ge21hdDN9IGIgdGhlIHNlY29uZCBvcGVyYW5kXHJcbiAqIEByZXR1cm5zIHttYXQzfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gc3VidHJhY3Qob3V0LCBhLCBiKSB7XG4gIG91dFswXSA9IGFbMF0gLSBiWzBdO1xuICBvdXRbMV0gPSBhWzFdIC0gYlsxXTtcbiAgb3V0WzJdID0gYVsyXSAtIGJbMl07XG4gIG91dFszXSA9IGFbM10gLSBiWzNdO1xuICBvdXRbNF0gPSBhWzRdIC0gYls0XTtcbiAgb3V0WzVdID0gYVs1XSAtIGJbNV07XG4gIG91dFs2XSA9IGFbNl0gLSBiWzZdO1xuICBvdXRbN10gPSBhWzddIC0gYls3XTtcbiAgb3V0WzhdID0gYVs4XSAtIGJbOF07XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogTXVsdGlwbHkgZWFjaCBlbGVtZW50IG9mIHRoZSBtYXRyaXggYnkgYSBzY2FsYXIuXHJcbiAqXHJcbiAqIEBwYXJhbSB7bWF0M30gb3V0IHRoZSByZWNlaXZpbmcgbWF0cml4XHJcbiAqIEBwYXJhbSB7bWF0M30gYSB0aGUgbWF0cml4IHRvIHNjYWxlXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBiIGFtb3VudCB0byBzY2FsZSB0aGUgbWF0cml4J3MgZWxlbWVudHMgYnlcclxuICogQHJldHVybnMge21hdDN9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBtdWx0aXBseVNjYWxhcihvdXQsIGEsIGIpIHtcbiAgb3V0WzBdID0gYVswXSAqIGI7XG4gIG91dFsxXSA9IGFbMV0gKiBiO1xuICBvdXRbMl0gPSBhWzJdICogYjtcbiAgb3V0WzNdID0gYVszXSAqIGI7XG4gIG91dFs0XSA9IGFbNF0gKiBiO1xuICBvdXRbNV0gPSBhWzVdICogYjtcbiAgb3V0WzZdID0gYVs2XSAqIGI7XG4gIG91dFs3XSA9IGFbN10gKiBiO1xuICBvdXRbOF0gPSBhWzhdICogYjtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBBZGRzIHR3byBtYXQzJ3MgYWZ0ZXIgbXVsdGlwbHlpbmcgZWFjaCBlbGVtZW50IG9mIHRoZSBzZWNvbmQgb3BlcmFuZCBieSBhIHNjYWxhciB2YWx1ZS5cclxuICpcclxuICogQHBhcmFtIHttYXQzfSBvdXQgdGhlIHJlY2VpdmluZyB2ZWN0b3JcclxuICogQHBhcmFtIHttYXQzfSBhIHRoZSBmaXJzdCBvcGVyYW5kXHJcbiAqIEBwYXJhbSB7bWF0M30gYiB0aGUgc2Vjb25kIG9wZXJhbmRcclxuICogQHBhcmFtIHtOdW1iZXJ9IHNjYWxlIHRoZSBhbW91bnQgdG8gc2NhbGUgYidzIGVsZW1lbnRzIGJ5IGJlZm9yZSBhZGRpbmdcclxuICogQHJldHVybnMge21hdDN9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBtdWx0aXBseVNjYWxhckFuZEFkZChvdXQsIGEsIGIsIHNjYWxlKSB7XG4gIG91dFswXSA9IGFbMF0gKyBiWzBdICogc2NhbGU7XG4gIG91dFsxXSA9IGFbMV0gKyBiWzFdICogc2NhbGU7XG4gIG91dFsyXSA9IGFbMl0gKyBiWzJdICogc2NhbGU7XG4gIG91dFszXSA9IGFbM10gKyBiWzNdICogc2NhbGU7XG4gIG91dFs0XSA9IGFbNF0gKyBiWzRdICogc2NhbGU7XG4gIG91dFs1XSA9IGFbNV0gKyBiWzVdICogc2NhbGU7XG4gIG91dFs2XSA9IGFbNl0gKyBiWzZdICogc2NhbGU7XG4gIG91dFs3XSA9IGFbN10gKyBiWzddICogc2NhbGU7XG4gIG91dFs4XSA9IGFbOF0gKyBiWzhdICogc2NhbGU7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogUmV0dXJucyB3aGV0aGVyIG9yIG5vdCB0aGUgbWF0cmljZXMgaGF2ZSBleGFjdGx5IHRoZSBzYW1lIGVsZW1lbnRzIGluIHRoZSBzYW1lIHBvc2l0aW9uICh3aGVuIGNvbXBhcmVkIHdpdGggPT09KVxyXG4gKlxyXG4gKiBAcGFyYW0ge21hdDN9IGEgVGhlIGZpcnN0IG1hdHJpeC5cclxuICogQHBhcmFtIHttYXQzfSBiIFRoZSBzZWNvbmQgbWF0cml4LlxyXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgbWF0cmljZXMgYXJlIGVxdWFsLCBmYWxzZSBvdGhlcndpc2UuXHJcbiAqL1xuXG5cbmZ1bmN0aW9uIGV4YWN0RXF1YWxzKGEsIGIpIHtcbiAgcmV0dXJuIGFbMF0gPT09IGJbMF0gJiYgYVsxXSA9PT0gYlsxXSAmJiBhWzJdID09PSBiWzJdICYmIGFbM10gPT09IGJbM10gJiYgYVs0XSA9PT0gYls0XSAmJiBhWzVdID09PSBiWzVdICYmIGFbNl0gPT09IGJbNl0gJiYgYVs3XSA9PT0gYls3XSAmJiBhWzhdID09PSBiWzhdO1xufVxuLyoqXHJcbiAqIFJldHVybnMgd2hldGhlciBvciBub3QgdGhlIG1hdHJpY2VzIGhhdmUgYXBwcm94aW1hdGVseSB0aGUgc2FtZSBlbGVtZW50cyBpbiB0aGUgc2FtZSBwb3NpdGlvbi5cclxuICpcclxuICogQHBhcmFtIHttYXQzfSBhIFRoZSBmaXJzdCBtYXRyaXguXHJcbiAqIEBwYXJhbSB7bWF0M30gYiBUaGUgc2Vjb25kIG1hdHJpeC5cclxuICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgdGhlIG1hdHJpY2VzIGFyZSBlcXVhbCwgZmFsc2Ugb3RoZXJ3aXNlLlxyXG4gKi9cblxuXG5mdW5jdGlvbiBlcXVhbHMoYSwgYikge1xuICB2YXIgYTAgPSBhWzBdLFxuICAgICAgYTEgPSBhWzFdLFxuICAgICAgYTIgPSBhWzJdLFxuICAgICAgYTMgPSBhWzNdLFxuICAgICAgYTQgPSBhWzRdLFxuICAgICAgYTUgPSBhWzVdLFxuICAgICAgYTYgPSBhWzZdLFxuICAgICAgYTcgPSBhWzddLFxuICAgICAgYTggPSBhWzhdO1xuICB2YXIgYjAgPSBiWzBdLFxuICAgICAgYjEgPSBiWzFdLFxuICAgICAgYjIgPSBiWzJdLFxuICAgICAgYjMgPSBiWzNdLFxuICAgICAgYjQgPSBiWzRdLFxuICAgICAgYjUgPSBiWzVdLFxuICAgICAgYjYgPSBiWzZdLFxuICAgICAgYjcgPSBiWzddLFxuICAgICAgYjggPSBiWzhdO1xuICByZXR1cm4gTWF0aC5hYnMoYTAgLSBiMCkgPD0gZ2xNYXRyaXguRVBTSUxPTiAqIE1hdGgubWF4KDEuMCwgTWF0aC5hYnMoYTApLCBNYXRoLmFicyhiMCkpICYmIE1hdGguYWJzKGExIC0gYjEpIDw9IGdsTWF0cml4LkVQU0lMT04gKiBNYXRoLm1heCgxLjAsIE1hdGguYWJzKGExKSwgTWF0aC5hYnMoYjEpKSAmJiBNYXRoLmFicyhhMiAtIGIyKSA8PSBnbE1hdHJpeC5FUFNJTE9OICogTWF0aC5tYXgoMS4wLCBNYXRoLmFicyhhMiksIE1hdGguYWJzKGIyKSkgJiYgTWF0aC5hYnMoYTMgLSBiMykgPD0gZ2xNYXRyaXguRVBTSUxPTiAqIE1hdGgubWF4KDEuMCwgTWF0aC5hYnMoYTMpLCBNYXRoLmFicyhiMykpICYmIE1hdGguYWJzKGE0IC0gYjQpIDw9IGdsTWF0cml4LkVQU0lMT04gKiBNYXRoLm1heCgxLjAsIE1hdGguYWJzKGE0KSwgTWF0aC5hYnMoYjQpKSAmJiBNYXRoLmFicyhhNSAtIGI1KSA8PSBnbE1hdHJpeC5FUFNJTE9OICogTWF0aC5tYXgoMS4wLCBNYXRoLmFicyhhNSksIE1hdGguYWJzKGI1KSkgJiYgTWF0aC5hYnMoYTYgLSBiNikgPD0gZ2xNYXRyaXguRVBTSUxPTiAqIE1hdGgubWF4KDEuMCwgTWF0aC5hYnMoYTYpLCBNYXRoLmFicyhiNikpICYmIE1hdGguYWJzKGE3IC0gYjcpIDw9IGdsTWF0cml4LkVQU0lMT04gKiBNYXRoLm1heCgxLjAsIE1hdGguYWJzKGE3KSwgTWF0aC5hYnMoYjcpKSAmJiBNYXRoLmFicyhhOCAtIGI4KSA8PSBnbE1hdHJpeC5FUFNJTE9OICogTWF0aC5tYXgoMS4wLCBNYXRoLmFicyhhOCksIE1hdGguYWJzKGI4KSk7XG59XG4vKipcclxuICogQWxpYXMgZm9yIHtAbGluayBtYXQzLm11bHRpcGx5fVxyXG4gKiBAZnVuY3Rpb25cclxuICovXG5cblxudmFyIG11bCA9IG11bHRpcGx5O1xuLyoqXHJcbiAqIEFsaWFzIGZvciB7QGxpbmsgbWF0My5zdWJ0cmFjdH1cclxuICogQGZ1bmN0aW9uXHJcbiAqL1xuXG5leHBvcnRzLm11bCA9IG11bDtcbnZhciBzdWIgPSBzdWJ0cmFjdDtcbmV4cG9ydHMuc3ViID0gc3ViOyIsIlwidXNlIHN0cmljdFwiO1xuXG5mdW5jdGlvbiBfdHlwZW9mKG9iaikgeyBcIkBiYWJlbC9oZWxwZXJzIC0gdHlwZW9mXCI7IGlmICh0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIFN5bWJvbC5pdGVyYXRvciA9PT0gXCJzeW1ib2xcIikgeyBfdHlwZW9mID0gZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgcmV0dXJuIHR5cGVvZiBvYmo7IH07IH0gZWxzZSB7IF90eXBlb2YgPSBmdW5jdGlvbiBfdHlwZW9mKG9iaikgeyByZXR1cm4gb2JqICYmIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvYmouY29uc3RydWN0b3IgPT09IFN5bWJvbCAmJiBvYmogIT09IFN5bWJvbC5wcm90b3R5cGUgPyBcInN5bWJvbFwiIDogdHlwZW9mIG9iajsgfTsgfSByZXR1cm4gX3R5cGVvZihvYmopOyB9XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmNyZWF0ZSA9IGNyZWF0ZTtcbmV4cG9ydHMuY2xvbmUgPSBjbG9uZTtcbmV4cG9ydHMuY29weSA9IGNvcHk7XG5leHBvcnRzLmZyb21WYWx1ZXMgPSBmcm9tVmFsdWVzO1xuZXhwb3J0cy5zZXQgPSBzZXQ7XG5leHBvcnRzLmlkZW50aXR5ID0gaWRlbnRpdHk7XG5leHBvcnRzLnRyYW5zcG9zZSA9IHRyYW5zcG9zZTtcbmV4cG9ydHMuaW52ZXJ0ID0gaW52ZXJ0O1xuZXhwb3J0cy5hZGpvaW50ID0gYWRqb2ludDtcbmV4cG9ydHMuZGV0ZXJtaW5hbnQgPSBkZXRlcm1pbmFudDtcbmV4cG9ydHMubXVsdGlwbHkgPSBtdWx0aXBseTtcbmV4cG9ydHMudHJhbnNsYXRlID0gdHJhbnNsYXRlO1xuZXhwb3J0cy5zY2FsZSA9IHNjYWxlO1xuZXhwb3J0cy5yb3RhdGUgPSByb3RhdGU7XG5leHBvcnRzLnJvdGF0ZVggPSByb3RhdGVYO1xuZXhwb3J0cy5yb3RhdGVZID0gcm90YXRlWTtcbmV4cG9ydHMucm90YXRlWiA9IHJvdGF0ZVo7XG5leHBvcnRzLmZyb21UcmFuc2xhdGlvbiA9IGZyb21UcmFuc2xhdGlvbjtcbmV4cG9ydHMuZnJvbVNjYWxpbmcgPSBmcm9tU2NhbGluZztcbmV4cG9ydHMuZnJvbVJvdGF0aW9uID0gZnJvbVJvdGF0aW9uO1xuZXhwb3J0cy5mcm9tWFJvdGF0aW9uID0gZnJvbVhSb3RhdGlvbjtcbmV4cG9ydHMuZnJvbVlSb3RhdGlvbiA9IGZyb21ZUm90YXRpb247XG5leHBvcnRzLmZyb21aUm90YXRpb24gPSBmcm9tWlJvdGF0aW9uO1xuZXhwb3J0cy5mcm9tUm90YXRpb25UcmFuc2xhdGlvbiA9IGZyb21Sb3RhdGlvblRyYW5zbGF0aW9uO1xuZXhwb3J0cy5mcm9tUXVhdDIgPSBmcm9tUXVhdDI7XG5leHBvcnRzLmdldFRyYW5zbGF0aW9uID0gZ2V0VHJhbnNsYXRpb247XG5leHBvcnRzLmdldFNjYWxpbmcgPSBnZXRTY2FsaW5nO1xuZXhwb3J0cy5nZXRSb3RhdGlvbiA9IGdldFJvdGF0aW9uO1xuZXhwb3J0cy5mcm9tUm90YXRpb25UcmFuc2xhdGlvblNjYWxlID0gZnJvbVJvdGF0aW9uVHJhbnNsYXRpb25TY2FsZTtcbmV4cG9ydHMuZnJvbVJvdGF0aW9uVHJhbnNsYXRpb25TY2FsZU9yaWdpbiA9IGZyb21Sb3RhdGlvblRyYW5zbGF0aW9uU2NhbGVPcmlnaW47XG5leHBvcnRzLmZyb21RdWF0ID0gZnJvbVF1YXQ7XG5leHBvcnRzLmZydXN0dW0gPSBmcnVzdHVtO1xuZXhwb3J0cy5wZXJzcGVjdGl2ZSA9IHBlcnNwZWN0aXZlO1xuZXhwb3J0cy5wZXJzcGVjdGl2ZUZyb21GaWVsZE9mVmlldyA9IHBlcnNwZWN0aXZlRnJvbUZpZWxkT2ZWaWV3O1xuZXhwb3J0cy5vcnRobyA9IG9ydGhvO1xuZXhwb3J0cy5sb29rQXQgPSBsb29rQXQ7XG5leHBvcnRzLnRhcmdldFRvID0gdGFyZ2V0VG87XG5leHBvcnRzLnN0ciA9IHN0cjtcbmV4cG9ydHMuZnJvYiA9IGZyb2I7XG5leHBvcnRzLmFkZCA9IGFkZDtcbmV4cG9ydHMuc3VidHJhY3QgPSBzdWJ0cmFjdDtcbmV4cG9ydHMubXVsdGlwbHlTY2FsYXIgPSBtdWx0aXBseVNjYWxhcjtcbmV4cG9ydHMubXVsdGlwbHlTY2FsYXJBbmRBZGQgPSBtdWx0aXBseVNjYWxhckFuZEFkZDtcbmV4cG9ydHMuZXhhY3RFcXVhbHMgPSBleGFjdEVxdWFscztcbmV4cG9ydHMuZXF1YWxzID0gZXF1YWxzO1xuZXhwb3J0cy5zdWIgPSBleHBvcnRzLm11bCA9IHZvaWQgMDtcblxudmFyIGdsTWF0cml4ID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQocmVxdWlyZShcIi4vY29tbW9uLmpzXCIpKTtcblxuZnVuY3Rpb24gX2dldFJlcXVpcmVXaWxkY2FyZENhY2hlKCkgeyBpZiAodHlwZW9mIFdlYWtNYXAgIT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIG51bGw7IHZhciBjYWNoZSA9IG5ldyBXZWFrTWFwKCk7IF9nZXRSZXF1aXJlV2lsZGNhcmRDYWNoZSA9IGZ1bmN0aW9uIF9nZXRSZXF1aXJlV2lsZGNhcmRDYWNoZSgpIHsgcmV0dXJuIGNhY2hlOyB9OyByZXR1cm4gY2FjaGU7IH1cblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQob2JqKSB7IGlmIChvYmogJiYgb2JqLl9fZXNNb2R1bGUpIHsgcmV0dXJuIG9iajsgfSBpZiAob2JqID09PSBudWxsIHx8IF90eXBlb2Yob2JqKSAhPT0gXCJvYmplY3RcIiAmJiB0eXBlb2Ygb2JqICE9PSBcImZ1bmN0aW9uXCIpIHsgcmV0dXJuIHsgXCJkZWZhdWx0XCI6IG9iaiB9OyB9IHZhciBjYWNoZSA9IF9nZXRSZXF1aXJlV2lsZGNhcmRDYWNoZSgpOyBpZiAoY2FjaGUgJiYgY2FjaGUuaGFzKG9iaikpIHsgcmV0dXJuIGNhY2hlLmdldChvYmopOyB9IHZhciBuZXdPYmogPSB7fTsgdmFyIGhhc1Byb3BlcnR5RGVzY3JpcHRvciA9IE9iamVjdC5kZWZpbmVQcm9wZXJ0eSAmJiBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yOyBmb3IgKHZhciBrZXkgaW4gb2JqKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpKSB7IHZhciBkZXNjID0gaGFzUHJvcGVydHlEZXNjcmlwdG9yID8gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmosIGtleSkgOiBudWxsOyBpZiAoZGVzYyAmJiAoZGVzYy5nZXQgfHwgZGVzYy5zZXQpKSB7IE9iamVjdC5kZWZpbmVQcm9wZXJ0eShuZXdPYmosIGtleSwgZGVzYyk7IH0gZWxzZSB7IG5ld09ialtrZXldID0gb2JqW2tleV07IH0gfSB9IG5ld09ialtcImRlZmF1bHRcIl0gPSBvYmo7IGlmIChjYWNoZSkgeyBjYWNoZS5zZXQob2JqLCBuZXdPYmopOyB9IHJldHVybiBuZXdPYmo7IH1cblxuLyoqXHJcbiAqIDR4NCBNYXRyaXg8YnI+Rm9ybWF0OiBjb2x1bW4tbWFqb3IsIHdoZW4gdHlwZWQgb3V0IGl0IGxvb2tzIGxpa2Ugcm93LW1ham9yPGJyPlRoZSBtYXRyaWNlcyBhcmUgYmVpbmcgcG9zdCBtdWx0aXBsaWVkLlxyXG4gKiBAbW9kdWxlIG1hdDRcclxuICovXG5cbi8qKlxyXG4gKiBDcmVhdGVzIGEgbmV3IGlkZW50aXR5IG1hdDRcclxuICpcclxuICogQHJldHVybnMge21hdDR9IGEgbmV3IDR4NCBtYXRyaXhcclxuICovXG5mdW5jdGlvbiBjcmVhdGUoKSB7XG4gIHZhciBvdXQgPSBuZXcgZ2xNYXRyaXguQVJSQVlfVFlQRSgxNik7XG5cbiAgaWYgKGdsTWF0cml4LkFSUkFZX1RZUEUgIT0gRmxvYXQzMkFycmF5KSB7XG4gICAgb3V0WzFdID0gMDtcbiAgICBvdXRbMl0gPSAwO1xuICAgIG91dFszXSA9IDA7XG4gICAgb3V0WzRdID0gMDtcbiAgICBvdXRbNl0gPSAwO1xuICAgIG91dFs3XSA9IDA7XG4gICAgb3V0WzhdID0gMDtcbiAgICBvdXRbOV0gPSAwO1xuICAgIG91dFsxMV0gPSAwO1xuICAgIG91dFsxMl0gPSAwO1xuICAgIG91dFsxM10gPSAwO1xuICAgIG91dFsxNF0gPSAwO1xuICB9XG5cbiAgb3V0WzBdID0gMTtcbiAgb3V0WzVdID0gMTtcbiAgb3V0WzEwXSA9IDE7XG4gIG91dFsxNV0gPSAxO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIENyZWF0ZXMgYSBuZXcgbWF0NCBpbml0aWFsaXplZCB3aXRoIHZhbHVlcyBmcm9tIGFuIGV4aXN0aW5nIG1hdHJpeFxyXG4gKlxyXG4gKiBAcGFyYW0ge21hdDR9IGEgbWF0cml4IHRvIGNsb25lXHJcbiAqIEByZXR1cm5zIHttYXQ0fSBhIG5ldyA0eDQgbWF0cml4XHJcbiAqL1xuXG5cbmZ1bmN0aW9uIGNsb25lKGEpIHtcbiAgdmFyIG91dCA9IG5ldyBnbE1hdHJpeC5BUlJBWV9UWVBFKDE2KTtcbiAgb3V0WzBdID0gYVswXTtcbiAgb3V0WzFdID0gYVsxXTtcbiAgb3V0WzJdID0gYVsyXTtcbiAgb3V0WzNdID0gYVszXTtcbiAgb3V0WzRdID0gYVs0XTtcbiAgb3V0WzVdID0gYVs1XTtcbiAgb3V0WzZdID0gYVs2XTtcbiAgb3V0WzddID0gYVs3XTtcbiAgb3V0WzhdID0gYVs4XTtcbiAgb3V0WzldID0gYVs5XTtcbiAgb3V0WzEwXSA9IGFbMTBdO1xuICBvdXRbMTFdID0gYVsxMV07XG4gIG91dFsxMl0gPSBhWzEyXTtcbiAgb3V0WzEzXSA9IGFbMTNdO1xuICBvdXRbMTRdID0gYVsxNF07XG4gIG91dFsxNV0gPSBhWzE1XTtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBDb3B5IHRoZSB2YWx1ZXMgZnJvbSBvbmUgbWF0NCB0byBhbm90aGVyXHJcbiAqXHJcbiAqIEBwYXJhbSB7bWF0NH0gb3V0IHRoZSByZWNlaXZpbmcgbWF0cml4XHJcbiAqIEBwYXJhbSB7bWF0NH0gYSB0aGUgc291cmNlIG1hdHJpeFxyXG4gKiBAcmV0dXJucyB7bWF0NH0gb3V0XHJcbiAqL1xuXG5cbmZ1bmN0aW9uIGNvcHkob3V0LCBhKSB7XG4gIG91dFswXSA9IGFbMF07XG4gIG91dFsxXSA9IGFbMV07XG4gIG91dFsyXSA9IGFbMl07XG4gIG91dFszXSA9IGFbM107XG4gIG91dFs0XSA9IGFbNF07XG4gIG91dFs1XSA9IGFbNV07XG4gIG91dFs2XSA9IGFbNl07XG4gIG91dFs3XSA9IGFbN107XG4gIG91dFs4XSA9IGFbOF07XG4gIG91dFs5XSA9IGFbOV07XG4gIG91dFsxMF0gPSBhWzEwXTtcbiAgb3V0WzExXSA9IGFbMTFdO1xuICBvdXRbMTJdID0gYVsxMl07XG4gIG91dFsxM10gPSBhWzEzXTtcbiAgb3V0WzE0XSA9IGFbMTRdO1xuICBvdXRbMTVdID0gYVsxNV07XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogQ3JlYXRlIGEgbmV3IG1hdDQgd2l0aCB0aGUgZ2l2ZW4gdmFsdWVzXHJcbiAqXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBtMDAgQ29tcG9uZW50IGluIGNvbHVtbiAwLCByb3cgMCBwb3NpdGlvbiAoaW5kZXggMClcclxuICogQHBhcmFtIHtOdW1iZXJ9IG0wMSBDb21wb25lbnQgaW4gY29sdW1uIDAsIHJvdyAxIHBvc2l0aW9uIChpbmRleCAxKVxyXG4gKiBAcGFyYW0ge051bWJlcn0gbTAyIENvbXBvbmVudCBpbiBjb2x1bW4gMCwgcm93IDIgcG9zaXRpb24gKGluZGV4IDIpXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBtMDMgQ29tcG9uZW50IGluIGNvbHVtbiAwLCByb3cgMyBwb3NpdGlvbiAoaW5kZXggMylcclxuICogQHBhcmFtIHtOdW1iZXJ9IG0xMCBDb21wb25lbnQgaW4gY29sdW1uIDEsIHJvdyAwIHBvc2l0aW9uIChpbmRleCA0KVxyXG4gKiBAcGFyYW0ge051bWJlcn0gbTExIENvbXBvbmVudCBpbiBjb2x1bW4gMSwgcm93IDEgcG9zaXRpb24gKGluZGV4IDUpXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBtMTIgQ29tcG9uZW50IGluIGNvbHVtbiAxLCByb3cgMiBwb3NpdGlvbiAoaW5kZXggNilcclxuICogQHBhcmFtIHtOdW1iZXJ9IG0xMyBDb21wb25lbnQgaW4gY29sdW1uIDEsIHJvdyAzIHBvc2l0aW9uIChpbmRleCA3KVxyXG4gKiBAcGFyYW0ge051bWJlcn0gbTIwIENvbXBvbmVudCBpbiBjb2x1bW4gMiwgcm93IDAgcG9zaXRpb24gKGluZGV4IDgpXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBtMjEgQ29tcG9uZW50IGluIGNvbHVtbiAyLCByb3cgMSBwb3NpdGlvbiAoaW5kZXggOSlcclxuICogQHBhcmFtIHtOdW1iZXJ9IG0yMiBDb21wb25lbnQgaW4gY29sdW1uIDIsIHJvdyAyIHBvc2l0aW9uIChpbmRleCAxMClcclxuICogQHBhcmFtIHtOdW1iZXJ9IG0yMyBDb21wb25lbnQgaW4gY29sdW1uIDIsIHJvdyAzIHBvc2l0aW9uIChpbmRleCAxMSlcclxuICogQHBhcmFtIHtOdW1iZXJ9IG0zMCBDb21wb25lbnQgaW4gY29sdW1uIDMsIHJvdyAwIHBvc2l0aW9uIChpbmRleCAxMilcclxuICogQHBhcmFtIHtOdW1iZXJ9IG0zMSBDb21wb25lbnQgaW4gY29sdW1uIDMsIHJvdyAxIHBvc2l0aW9uIChpbmRleCAxMylcclxuICogQHBhcmFtIHtOdW1iZXJ9IG0zMiBDb21wb25lbnQgaW4gY29sdW1uIDMsIHJvdyAyIHBvc2l0aW9uIChpbmRleCAxNClcclxuICogQHBhcmFtIHtOdW1iZXJ9IG0zMyBDb21wb25lbnQgaW4gY29sdW1uIDMsIHJvdyAzIHBvc2l0aW9uIChpbmRleCAxNSlcclxuICogQHJldHVybnMge21hdDR9IEEgbmV3IG1hdDRcclxuICovXG5cblxuZnVuY3Rpb24gZnJvbVZhbHVlcyhtMDAsIG0wMSwgbTAyLCBtMDMsIG0xMCwgbTExLCBtMTIsIG0xMywgbTIwLCBtMjEsIG0yMiwgbTIzLCBtMzAsIG0zMSwgbTMyLCBtMzMpIHtcbiAgdmFyIG91dCA9IG5ldyBnbE1hdHJpeC5BUlJBWV9UWVBFKDE2KTtcbiAgb3V0WzBdID0gbTAwO1xuICBvdXRbMV0gPSBtMDE7XG4gIG91dFsyXSA9IG0wMjtcbiAgb3V0WzNdID0gbTAzO1xuICBvdXRbNF0gPSBtMTA7XG4gIG91dFs1XSA9IG0xMTtcbiAgb3V0WzZdID0gbTEyO1xuICBvdXRbN10gPSBtMTM7XG4gIG91dFs4XSA9IG0yMDtcbiAgb3V0WzldID0gbTIxO1xuICBvdXRbMTBdID0gbTIyO1xuICBvdXRbMTFdID0gbTIzO1xuICBvdXRbMTJdID0gbTMwO1xuICBvdXRbMTNdID0gbTMxO1xuICBvdXRbMTRdID0gbTMyO1xuICBvdXRbMTVdID0gbTMzO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIFNldCB0aGUgY29tcG9uZW50cyBvZiBhIG1hdDQgdG8gdGhlIGdpdmVuIHZhbHVlc1xyXG4gKlxyXG4gKiBAcGFyYW0ge21hdDR9IG91dCB0aGUgcmVjZWl2aW5nIG1hdHJpeFxyXG4gKiBAcGFyYW0ge051bWJlcn0gbTAwIENvbXBvbmVudCBpbiBjb2x1bW4gMCwgcm93IDAgcG9zaXRpb24gKGluZGV4IDApXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBtMDEgQ29tcG9uZW50IGluIGNvbHVtbiAwLCByb3cgMSBwb3NpdGlvbiAoaW5kZXggMSlcclxuICogQHBhcmFtIHtOdW1iZXJ9IG0wMiBDb21wb25lbnQgaW4gY29sdW1uIDAsIHJvdyAyIHBvc2l0aW9uIChpbmRleCAyKVxyXG4gKiBAcGFyYW0ge051bWJlcn0gbTAzIENvbXBvbmVudCBpbiBjb2x1bW4gMCwgcm93IDMgcG9zaXRpb24gKGluZGV4IDMpXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBtMTAgQ29tcG9uZW50IGluIGNvbHVtbiAxLCByb3cgMCBwb3NpdGlvbiAoaW5kZXggNClcclxuICogQHBhcmFtIHtOdW1iZXJ9IG0xMSBDb21wb25lbnQgaW4gY29sdW1uIDEsIHJvdyAxIHBvc2l0aW9uIChpbmRleCA1KVxyXG4gKiBAcGFyYW0ge051bWJlcn0gbTEyIENvbXBvbmVudCBpbiBjb2x1bW4gMSwgcm93IDIgcG9zaXRpb24gKGluZGV4IDYpXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBtMTMgQ29tcG9uZW50IGluIGNvbHVtbiAxLCByb3cgMyBwb3NpdGlvbiAoaW5kZXggNylcclxuICogQHBhcmFtIHtOdW1iZXJ9IG0yMCBDb21wb25lbnQgaW4gY29sdW1uIDIsIHJvdyAwIHBvc2l0aW9uIChpbmRleCA4KVxyXG4gKiBAcGFyYW0ge051bWJlcn0gbTIxIENvbXBvbmVudCBpbiBjb2x1bW4gMiwgcm93IDEgcG9zaXRpb24gKGluZGV4IDkpXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBtMjIgQ29tcG9uZW50IGluIGNvbHVtbiAyLCByb3cgMiBwb3NpdGlvbiAoaW5kZXggMTApXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBtMjMgQ29tcG9uZW50IGluIGNvbHVtbiAyLCByb3cgMyBwb3NpdGlvbiAoaW5kZXggMTEpXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBtMzAgQ29tcG9uZW50IGluIGNvbHVtbiAzLCByb3cgMCBwb3NpdGlvbiAoaW5kZXggMTIpXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBtMzEgQ29tcG9uZW50IGluIGNvbHVtbiAzLCByb3cgMSBwb3NpdGlvbiAoaW5kZXggMTMpXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBtMzIgQ29tcG9uZW50IGluIGNvbHVtbiAzLCByb3cgMiBwb3NpdGlvbiAoaW5kZXggMTQpXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBtMzMgQ29tcG9uZW50IGluIGNvbHVtbiAzLCByb3cgMyBwb3NpdGlvbiAoaW5kZXggMTUpXHJcbiAqIEByZXR1cm5zIHttYXQ0fSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gc2V0KG91dCwgbTAwLCBtMDEsIG0wMiwgbTAzLCBtMTAsIG0xMSwgbTEyLCBtMTMsIG0yMCwgbTIxLCBtMjIsIG0yMywgbTMwLCBtMzEsIG0zMiwgbTMzKSB7XG4gIG91dFswXSA9IG0wMDtcbiAgb3V0WzFdID0gbTAxO1xuICBvdXRbMl0gPSBtMDI7XG4gIG91dFszXSA9IG0wMztcbiAgb3V0WzRdID0gbTEwO1xuICBvdXRbNV0gPSBtMTE7XG4gIG91dFs2XSA9IG0xMjtcbiAgb3V0WzddID0gbTEzO1xuICBvdXRbOF0gPSBtMjA7XG4gIG91dFs5XSA9IG0yMTtcbiAgb3V0WzEwXSA9IG0yMjtcbiAgb3V0WzExXSA9IG0yMztcbiAgb3V0WzEyXSA9IG0zMDtcbiAgb3V0WzEzXSA9IG0zMTtcbiAgb3V0WzE0XSA9IG0zMjtcbiAgb3V0WzE1XSA9IG0zMztcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBTZXQgYSBtYXQ0IHRvIHRoZSBpZGVudGl0eSBtYXRyaXhcclxuICpcclxuICogQHBhcmFtIHttYXQ0fSBvdXQgdGhlIHJlY2VpdmluZyBtYXRyaXhcclxuICogQHJldHVybnMge21hdDR9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBpZGVudGl0eShvdXQpIHtcbiAgb3V0WzBdID0gMTtcbiAgb3V0WzFdID0gMDtcbiAgb3V0WzJdID0gMDtcbiAgb3V0WzNdID0gMDtcbiAgb3V0WzRdID0gMDtcbiAgb3V0WzVdID0gMTtcbiAgb3V0WzZdID0gMDtcbiAgb3V0WzddID0gMDtcbiAgb3V0WzhdID0gMDtcbiAgb3V0WzldID0gMDtcbiAgb3V0WzEwXSA9IDE7XG4gIG91dFsxMV0gPSAwO1xuICBvdXRbMTJdID0gMDtcbiAgb3V0WzEzXSA9IDA7XG4gIG91dFsxNF0gPSAwO1xuICBvdXRbMTVdID0gMTtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBUcmFuc3Bvc2UgdGhlIHZhbHVlcyBvZiBhIG1hdDRcclxuICpcclxuICogQHBhcmFtIHttYXQ0fSBvdXQgdGhlIHJlY2VpdmluZyBtYXRyaXhcclxuICogQHBhcmFtIHttYXQ0fSBhIHRoZSBzb3VyY2UgbWF0cml4XHJcbiAqIEByZXR1cm5zIHttYXQ0fSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gdHJhbnNwb3NlKG91dCwgYSkge1xuICAvLyBJZiB3ZSBhcmUgdHJhbnNwb3Npbmcgb3Vyc2VsdmVzIHdlIGNhbiBza2lwIGEgZmV3IHN0ZXBzIGJ1dCBoYXZlIHRvIGNhY2hlIHNvbWUgdmFsdWVzXG4gIGlmIChvdXQgPT09IGEpIHtcbiAgICB2YXIgYTAxID0gYVsxXSxcbiAgICAgICAgYTAyID0gYVsyXSxcbiAgICAgICAgYTAzID0gYVszXTtcbiAgICB2YXIgYTEyID0gYVs2XSxcbiAgICAgICAgYTEzID0gYVs3XTtcbiAgICB2YXIgYTIzID0gYVsxMV07XG4gICAgb3V0WzFdID0gYVs0XTtcbiAgICBvdXRbMl0gPSBhWzhdO1xuICAgIG91dFszXSA9IGFbMTJdO1xuICAgIG91dFs0XSA9IGEwMTtcbiAgICBvdXRbNl0gPSBhWzldO1xuICAgIG91dFs3XSA9IGFbMTNdO1xuICAgIG91dFs4XSA9IGEwMjtcbiAgICBvdXRbOV0gPSBhMTI7XG4gICAgb3V0WzExXSA9IGFbMTRdO1xuICAgIG91dFsxMl0gPSBhMDM7XG4gICAgb3V0WzEzXSA9IGExMztcbiAgICBvdXRbMTRdID0gYTIzO1xuICB9IGVsc2Uge1xuICAgIG91dFswXSA9IGFbMF07XG4gICAgb3V0WzFdID0gYVs0XTtcbiAgICBvdXRbMl0gPSBhWzhdO1xuICAgIG91dFszXSA9IGFbMTJdO1xuICAgIG91dFs0XSA9IGFbMV07XG4gICAgb3V0WzVdID0gYVs1XTtcbiAgICBvdXRbNl0gPSBhWzldO1xuICAgIG91dFs3XSA9IGFbMTNdO1xuICAgIG91dFs4XSA9IGFbMl07XG4gICAgb3V0WzldID0gYVs2XTtcbiAgICBvdXRbMTBdID0gYVsxMF07XG4gICAgb3V0WzExXSA9IGFbMTRdO1xuICAgIG91dFsxMl0gPSBhWzNdO1xuICAgIG91dFsxM10gPSBhWzddO1xuICAgIG91dFsxNF0gPSBhWzExXTtcbiAgICBvdXRbMTVdID0gYVsxNV07XG4gIH1cblxuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIEludmVydHMgYSBtYXQ0XHJcbiAqXHJcbiAqIEBwYXJhbSB7bWF0NH0gb3V0IHRoZSByZWNlaXZpbmcgbWF0cml4XHJcbiAqIEBwYXJhbSB7bWF0NH0gYSB0aGUgc291cmNlIG1hdHJpeFxyXG4gKiBAcmV0dXJucyB7bWF0NH0gb3V0XHJcbiAqL1xuXG5cbmZ1bmN0aW9uIGludmVydChvdXQsIGEpIHtcbiAgdmFyIGEwMCA9IGFbMF0sXG4gICAgICBhMDEgPSBhWzFdLFxuICAgICAgYTAyID0gYVsyXSxcbiAgICAgIGEwMyA9IGFbM107XG4gIHZhciBhMTAgPSBhWzRdLFxuICAgICAgYTExID0gYVs1XSxcbiAgICAgIGExMiA9IGFbNl0sXG4gICAgICBhMTMgPSBhWzddO1xuICB2YXIgYTIwID0gYVs4XSxcbiAgICAgIGEyMSA9IGFbOV0sXG4gICAgICBhMjIgPSBhWzEwXSxcbiAgICAgIGEyMyA9IGFbMTFdO1xuICB2YXIgYTMwID0gYVsxMl0sXG4gICAgICBhMzEgPSBhWzEzXSxcbiAgICAgIGEzMiA9IGFbMTRdLFxuICAgICAgYTMzID0gYVsxNV07XG4gIHZhciBiMDAgPSBhMDAgKiBhMTEgLSBhMDEgKiBhMTA7XG4gIHZhciBiMDEgPSBhMDAgKiBhMTIgLSBhMDIgKiBhMTA7XG4gIHZhciBiMDIgPSBhMDAgKiBhMTMgLSBhMDMgKiBhMTA7XG4gIHZhciBiMDMgPSBhMDEgKiBhMTIgLSBhMDIgKiBhMTE7XG4gIHZhciBiMDQgPSBhMDEgKiBhMTMgLSBhMDMgKiBhMTE7XG4gIHZhciBiMDUgPSBhMDIgKiBhMTMgLSBhMDMgKiBhMTI7XG4gIHZhciBiMDYgPSBhMjAgKiBhMzEgLSBhMjEgKiBhMzA7XG4gIHZhciBiMDcgPSBhMjAgKiBhMzIgLSBhMjIgKiBhMzA7XG4gIHZhciBiMDggPSBhMjAgKiBhMzMgLSBhMjMgKiBhMzA7XG4gIHZhciBiMDkgPSBhMjEgKiBhMzIgLSBhMjIgKiBhMzE7XG4gIHZhciBiMTAgPSBhMjEgKiBhMzMgLSBhMjMgKiBhMzE7XG4gIHZhciBiMTEgPSBhMjIgKiBhMzMgLSBhMjMgKiBhMzI7IC8vIENhbGN1bGF0ZSB0aGUgZGV0ZXJtaW5hbnRcblxuICB2YXIgZGV0ID0gYjAwICogYjExIC0gYjAxICogYjEwICsgYjAyICogYjA5ICsgYjAzICogYjA4IC0gYjA0ICogYjA3ICsgYjA1ICogYjA2O1xuXG4gIGlmICghZGV0KSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBkZXQgPSAxLjAgLyBkZXQ7XG4gIG91dFswXSA9IChhMTEgKiBiMTEgLSBhMTIgKiBiMTAgKyBhMTMgKiBiMDkpICogZGV0O1xuICBvdXRbMV0gPSAoYTAyICogYjEwIC0gYTAxICogYjExIC0gYTAzICogYjA5KSAqIGRldDtcbiAgb3V0WzJdID0gKGEzMSAqIGIwNSAtIGEzMiAqIGIwNCArIGEzMyAqIGIwMykgKiBkZXQ7XG4gIG91dFszXSA9IChhMjIgKiBiMDQgLSBhMjEgKiBiMDUgLSBhMjMgKiBiMDMpICogZGV0O1xuICBvdXRbNF0gPSAoYTEyICogYjA4IC0gYTEwICogYjExIC0gYTEzICogYjA3KSAqIGRldDtcbiAgb3V0WzVdID0gKGEwMCAqIGIxMSAtIGEwMiAqIGIwOCArIGEwMyAqIGIwNykgKiBkZXQ7XG4gIG91dFs2XSA9IChhMzIgKiBiMDIgLSBhMzAgKiBiMDUgLSBhMzMgKiBiMDEpICogZGV0O1xuICBvdXRbN10gPSAoYTIwICogYjA1IC0gYTIyICogYjAyICsgYTIzICogYjAxKSAqIGRldDtcbiAgb3V0WzhdID0gKGExMCAqIGIxMCAtIGExMSAqIGIwOCArIGExMyAqIGIwNikgKiBkZXQ7XG4gIG91dFs5XSA9IChhMDEgKiBiMDggLSBhMDAgKiBiMTAgLSBhMDMgKiBiMDYpICogZGV0O1xuICBvdXRbMTBdID0gKGEzMCAqIGIwNCAtIGEzMSAqIGIwMiArIGEzMyAqIGIwMCkgKiBkZXQ7XG4gIG91dFsxMV0gPSAoYTIxICogYjAyIC0gYTIwICogYjA0IC0gYTIzICogYjAwKSAqIGRldDtcbiAgb3V0WzEyXSA9IChhMTEgKiBiMDcgLSBhMTAgKiBiMDkgLSBhMTIgKiBiMDYpICogZGV0O1xuICBvdXRbMTNdID0gKGEwMCAqIGIwOSAtIGEwMSAqIGIwNyArIGEwMiAqIGIwNikgKiBkZXQ7XG4gIG91dFsxNF0gPSAoYTMxICogYjAxIC0gYTMwICogYjAzIC0gYTMyICogYjAwKSAqIGRldDtcbiAgb3V0WzE1XSA9IChhMjAgKiBiMDMgLSBhMjEgKiBiMDEgKyBhMjIgKiBiMDApICogZGV0O1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIENhbGN1bGF0ZXMgdGhlIGFkanVnYXRlIG9mIGEgbWF0NFxyXG4gKlxyXG4gKiBAcGFyYW0ge21hdDR9IG91dCB0aGUgcmVjZWl2aW5nIG1hdHJpeFxyXG4gKiBAcGFyYW0ge21hdDR9IGEgdGhlIHNvdXJjZSBtYXRyaXhcclxuICogQHJldHVybnMge21hdDR9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBhZGpvaW50KG91dCwgYSkge1xuICB2YXIgYTAwID0gYVswXSxcbiAgICAgIGEwMSA9IGFbMV0sXG4gICAgICBhMDIgPSBhWzJdLFxuICAgICAgYTAzID0gYVszXTtcbiAgdmFyIGExMCA9IGFbNF0sXG4gICAgICBhMTEgPSBhWzVdLFxuICAgICAgYTEyID0gYVs2XSxcbiAgICAgIGExMyA9IGFbN107XG4gIHZhciBhMjAgPSBhWzhdLFxuICAgICAgYTIxID0gYVs5XSxcbiAgICAgIGEyMiA9IGFbMTBdLFxuICAgICAgYTIzID0gYVsxMV07XG4gIHZhciBhMzAgPSBhWzEyXSxcbiAgICAgIGEzMSA9IGFbMTNdLFxuICAgICAgYTMyID0gYVsxNF0sXG4gICAgICBhMzMgPSBhWzE1XTtcbiAgb3V0WzBdID0gYTExICogKGEyMiAqIGEzMyAtIGEyMyAqIGEzMikgLSBhMjEgKiAoYTEyICogYTMzIC0gYTEzICogYTMyKSArIGEzMSAqIChhMTIgKiBhMjMgLSBhMTMgKiBhMjIpO1xuICBvdXRbMV0gPSAtKGEwMSAqIChhMjIgKiBhMzMgLSBhMjMgKiBhMzIpIC0gYTIxICogKGEwMiAqIGEzMyAtIGEwMyAqIGEzMikgKyBhMzEgKiAoYTAyICogYTIzIC0gYTAzICogYTIyKSk7XG4gIG91dFsyXSA9IGEwMSAqIChhMTIgKiBhMzMgLSBhMTMgKiBhMzIpIC0gYTExICogKGEwMiAqIGEzMyAtIGEwMyAqIGEzMikgKyBhMzEgKiAoYTAyICogYTEzIC0gYTAzICogYTEyKTtcbiAgb3V0WzNdID0gLShhMDEgKiAoYTEyICogYTIzIC0gYTEzICogYTIyKSAtIGExMSAqIChhMDIgKiBhMjMgLSBhMDMgKiBhMjIpICsgYTIxICogKGEwMiAqIGExMyAtIGEwMyAqIGExMikpO1xuICBvdXRbNF0gPSAtKGExMCAqIChhMjIgKiBhMzMgLSBhMjMgKiBhMzIpIC0gYTIwICogKGExMiAqIGEzMyAtIGExMyAqIGEzMikgKyBhMzAgKiAoYTEyICogYTIzIC0gYTEzICogYTIyKSk7XG4gIG91dFs1XSA9IGEwMCAqIChhMjIgKiBhMzMgLSBhMjMgKiBhMzIpIC0gYTIwICogKGEwMiAqIGEzMyAtIGEwMyAqIGEzMikgKyBhMzAgKiAoYTAyICogYTIzIC0gYTAzICogYTIyKTtcbiAgb3V0WzZdID0gLShhMDAgKiAoYTEyICogYTMzIC0gYTEzICogYTMyKSAtIGExMCAqIChhMDIgKiBhMzMgLSBhMDMgKiBhMzIpICsgYTMwICogKGEwMiAqIGExMyAtIGEwMyAqIGExMikpO1xuICBvdXRbN10gPSBhMDAgKiAoYTEyICogYTIzIC0gYTEzICogYTIyKSAtIGExMCAqIChhMDIgKiBhMjMgLSBhMDMgKiBhMjIpICsgYTIwICogKGEwMiAqIGExMyAtIGEwMyAqIGExMik7XG4gIG91dFs4XSA9IGExMCAqIChhMjEgKiBhMzMgLSBhMjMgKiBhMzEpIC0gYTIwICogKGExMSAqIGEzMyAtIGExMyAqIGEzMSkgKyBhMzAgKiAoYTExICogYTIzIC0gYTEzICogYTIxKTtcbiAgb3V0WzldID0gLShhMDAgKiAoYTIxICogYTMzIC0gYTIzICogYTMxKSAtIGEyMCAqIChhMDEgKiBhMzMgLSBhMDMgKiBhMzEpICsgYTMwICogKGEwMSAqIGEyMyAtIGEwMyAqIGEyMSkpO1xuICBvdXRbMTBdID0gYTAwICogKGExMSAqIGEzMyAtIGExMyAqIGEzMSkgLSBhMTAgKiAoYTAxICogYTMzIC0gYTAzICogYTMxKSArIGEzMCAqIChhMDEgKiBhMTMgLSBhMDMgKiBhMTEpO1xuICBvdXRbMTFdID0gLShhMDAgKiAoYTExICogYTIzIC0gYTEzICogYTIxKSAtIGExMCAqIChhMDEgKiBhMjMgLSBhMDMgKiBhMjEpICsgYTIwICogKGEwMSAqIGExMyAtIGEwMyAqIGExMSkpO1xuICBvdXRbMTJdID0gLShhMTAgKiAoYTIxICogYTMyIC0gYTIyICogYTMxKSAtIGEyMCAqIChhMTEgKiBhMzIgLSBhMTIgKiBhMzEpICsgYTMwICogKGExMSAqIGEyMiAtIGExMiAqIGEyMSkpO1xuICBvdXRbMTNdID0gYTAwICogKGEyMSAqIGEzMiAtIGEyMiAqIGEzMSkgLSBhMjAgKiAoYTAxICogYTMyIC0gYTAyICogYTMxKSArIGEzMCAqIChhMDEgKiBhMjIgLSBhMDIgKiBhMjEpO1xuICBvdXRbMTRdID0gLShhMDAgKiAoYTExICogYTMyIC0gYTEyICogYTMxKSAtIGExMCAqIChhMDEgKiBhMzIgLSBhMDIgKiBhMzEpICsgYTMwICogKGEwMSAqIGExMiAtIGEwMiAqIGExMSkpO1xuICBvdXRbMTVdID0gYTAwICogKGExMSAqIGEyMiAtIGExMiAqIGEyMSkgLSBhMTAgKiAoYTAxICogYTIyIC0gYTAyICogYTIxKSArIGEyMCAqIChhMDEgKiBhMTIgLSBhMDIgKiBhMTEpO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIENhbGN1bGF0ZXMgdGhlIGRldGVybWluYW50IG9mIGEgbWF0NFxyXG4gKlxyXG4gKiBAcGFyYW0ge21hdDR9IGEgdGhlIHNvdXJjZSBtYXRyaXhcclxuICogQHJldHVybnMge051bWJlcn0gZGV0ZXJtaW5hbnQgb2YgYVxyXG4gKi9cblxuXG5mdW5jdGlvbiBkZXRlcm1pbmFudChhKSB7XG4gIHZhciBhMDAgPSBhWzBdLFxuICAgICAgYTAxID0gYVsxXSxcbiAgICAgIGEwMiA9IGFbMl0sXG4gICAgICBhMDMgPSBhWzNdO1xuICB2YXIgYTEwID0gYVs0XSxcbiAgICAgIGExMSA9IGFbNV0sXG4gICAgICBhMTIgPSBhWzZdLFxuICAgICAgYTEzID0gYVs3XTtcbiAgdmFyIGEyMCA9IGFbOF0sXG4gICAgICBhMjEgPSBhWzldLFxuICAgICAgYTIyID0gYVsxMF0sXG4gICAgICBhMjMgPSBhWzExXTtcbiAgdmFyIGEzMCA9IGFbMTJdLFxuICAgICAgYTMxID0gYVsxM10sXG4gICAgICBhMzIgPSBhWzE0XSxcbiAgICAgIGEzMyA9IGFbMTVdO1xuICB2YXIgYjAwID0gYTAwICogYTExIC0gYTAxICogYTEwO1xuICB2YXIgYjAxID0gYTAwICogYTEyIC0gYTAyICogYTEwO1xuICB2YXIgYjAyID0gYTAwICogYTEzIC0gYTAzICogYTEwO1xuICB2YXIgYjAzID0gYTAxICogYTEyIC0gYTAyICogYTExO1xuICB2YXIgYjA0ID0gYTAxICogYTEzIC0gYTAzICogYTExO1xuICB2YXIgYjA1ID0gYTAyICogYTEzIC0gYTAzICogYTEyO1xuICB2YXIgYjA2ID0gYTIwICogYTMxIC0gYTIxICogYTMwO1xuICB2YXIgYjA3ID0gYTIwICogYTMyIC0gYTIyICogYTMwO1xuICB2YXIgYjA4ID0gYTIwICogYTMzIC0gYTIzICogYTMwO1xuICB2YXIgYjA5ID0gYTIxICogYTMyIC0gYTIyICogYTMxO1xuICB2YXIgYjEwID0gYTIxICogYTMzIC0gYTIzICogYTMxO1xuICB2YXIgYjExID0gYTIyICogYTMzIC0gYTIzICogYTMyOyAvLyBDYWxjdWxhdGUgdGhlIGRldGVybWluYW50XG5cbiAgcmV0dXJuIGIwMCAqIGIxMSAtIGIwMSAqIGIxMCArIGIwMiAqIGIwOSArIGIwMyAqIGIwOCAtIGIwNCAqIGIwNyArIGIwNSAqIGIwNjtcbn1cbi8qKlxyXG4gKiBNdWx0aXBsaWVzIHR3byBtYXQ0c1xyXG4gKlxyXG4gKiBAcGFyYW0ge21hdDR9IG91dCB0aGUgcmVjZWl2aW5nIG1hdHJpeFxyXG4gKiBAcGFyYW0ge21hdDR9IGEgdGhlIGZpcnN0IG9wZXJhbmRcclxuICogQHBhcmFtIHttYXQ0fSBiIHRoZSBzZWNvbmQgb3BlcmFuZFxyXG4gKiBAcmV0dXJucyB7bWF0NH0gb3V0XHJcbiAqL1xuXG5cbmZ1bmN0aW9uIG11bHRpcGx5KG91dCwgYSwgYikge1xuICB2YXIgYTAwID0gYVswXSxcbiAgICAgIGEwMSA9IGFbMV0sXG4gICAgICBhMDIgPSBhWzJdLFxuICAgICAgYTAzID0gYVszXTtcbiAgdmFyIGExMCA9IGFbNF0sXG4gICAgICBhMTEgPSBhWzVdLFxuICAgICAgYTEyID0gYVs2XSxcbiAgICAgIGExMyA9IGFbN107XG4gIHZhciBhMjAgPSBhWzhdLFxuICAgICAgYTIxID0gYVs5XSxcbiAgICAgIGEyMiA9IGFbMTBdLFxuICAgICAgYTIzID0gYVsxMV07XG4gIHZhciBhMzAgPSBhWzEyXSxcbiAgICAgIGEzMSA9IGFbMTNdLFxuICAgICAgYTMyID0gYVsxNF0sXG4gICAgICBhMzMgPSBhWzE1XTsgLy8gQ2FjaGUgb25seSB0aGUgY3VycmVudCBsaW5lIG9mIHRoZSBzZWNvbmQgbWF0cml4XG5cbiAgdmFyIGIwID0gYlswXSxcbiAgICAgIGIxID0gYlsxXSxcbiAgICAgIGIyID0gYlsyXSxcbiAgICAgIGIzID0gYlszXTtcbiAgb3V0WzBdID0gYjAgKiBhMDAgKyBiMSAqIGExMCArIGIyICogYTIwICsgYjMgKiBhMzA7XG4gIG91dFsxXSA9IGIwICogYTAxICsgYjEgKiBhMTEgKyBiMiAqIGEyMSArIGIzICogYTMxO1xuICBvdXRbMl0gPSBiMCAqIGEwMiArIGIxICogYTEyICsgYjIgKiBhMjIgKyBiMyAqIGEzMjtcbiAgb3V0WzNdID0gYjAgKiBhMDMgKyBiMSAqIGExMyArIGIyICogYTIzICsgYjMgKiBhMzM7XG4gIGIwID0gYls0XTtcbiAgYjEgPSBiWzVdO1xuICBiMiA9IGJbNl07XG4gIGIzID0gYls3XTtcbiAgb3V0WzRdID0gYjAgKiBhMDAgKyBiMSAqIGExMCArIGIyICogYTIwICsgYjMgKiBhMzA7XG4gIG91dFs1XSA9IGIwICogYTAxICsgYjEgKiBhMTEgKyBiMiAqIGEyMSArIGIzICogYTMxO1xuICBvdXRbNl0gPSBiMCAqIGEwMiArIGIxICogYTEyICsgYjIgKiBhMjIgKyBiMyAqIGEzMjtcbiAgb3V0WzddID0gYjAgKiBhMDMgKyBiMSAqIGExMyArIGIyICogYTIzICsgYjMgKiBhMzM7XG4gIGIwID0gYls4XTtcbiAgYjEgPSBiWzldO1xuICBiMiA9IGJbMTBdO1xuICBiMyA9IGJbMTFdO1xuICBvdXRbOF0gPSBiMCAqIGEwMCArIGIxICogYTEwICsgYjIgKiBhMjAgKyBiMyAqIGEzMDtcbiAgb3V0WzldID0gYjAgKiBhMDEgKyBiMSAqIGExMSArIGIyICogYTIxICsgYjMgKiBhMzE7XG4gIG91dFsxMF0gPSBiMCAqIGEwMiArIGIxICogYTEyICsgYjIgKiBhMjIgKyBiMyAqIGEzMjtcbiAgb3V0WzExXSA9IGIwICogYTAzICsgYjEgKiBhMTMgKyBiMiAqIGEyMyArIGIzICogYTMzO1xuICBiMCA9IGJbMTJdO1xuICBiMSA9IGJbMTNdO1xuICBiMiA9IGJbMTRdO1xuICBiMyA9IGJbMTVdO1xuICBvdXRbMTJdID0gYjAgKiBhMDAgKyBiMSAqIGExMCArIGIyICogYTIwICsgYjMgKiBhMzA7XG4gIG91dFsxM10gPSBiMCAqIGEwMSArIGIxICogYTExICsgYjIgKiBhMjEgKyBiMyAqIGEzMTtcbiAgb3V0WzE0XSA9IGIwICogYTAyICsgYjEgKiBhMTIgKyBiMiAqIGEyMiArIGIzICogYTMyO1xuICBvdXRbMTVdID0gYjAgKiBhMDMgKyBiMSAqIGExMyArIGIyICogYTIzICsgYjMgKiBhMzM7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogVHJhbnNsYXRlIGEgbWF0NCBieSB0aGUgZ2l2ZW4gdmVjdG9yXHJcbiAqXHJcbiAqIEBwYXJhbSB7bWF0NH0gb3V0IHRoZSByZWNlaXZpbmcgbWF0cml4XHJcbiAqIEBwYXJhbSB7bWF0NH0gYSB0aGUgbWF0cml4IHRvIHRyYW5zbGF0ZVxyXG4gKiBAcGFyYW0ge3ZlYzN9IHYgdmVjdG9yIHRvIHRyYW5zbGF0ZSBieVxyXG4gKiBAcmV0dXJucyB7bWF0NH0gb3V0XHJcbiAqL1xuXG5cbmZ1bmN0aW9uIHRyYW5zbGF0ZShvdXQsIGEsIHYpIHtcbiAgdmFyIHggPSB2WzBdLFxuICAgICAgeSA9IHZbMV0sXG4gICAgICB6ID0gdlsyXTtcbiAgdmFyIGEwMCwgYTAxLCBhMDIsIGEwMztcbiAgdmFyIGExMCwgYTExLCBhMTIsIGExMztcbiAgdmFyIGEyMCwgYTIxLCBhMjIsIGEyMztcblxuICBpZiAoYSA9PT0gb3V0KSB7XG4gICAgb3V0WzEyXSA9IGFbMF0gKiB4ICsgYVs0XSAqIHkgKyBhWzhdICogeiArIGFbMTJdO1xuICAgIG91dFsxM10gPSBhWzFdICogeCArIGFbNV0gKiB5ICsgYVs5XSAqIHogKyBhWzEzXTtcbiAgICBvdXRbMTRdID0gYVsyXSAqIHggKyBhWzZdICogeSArIGFbMTBdICogeiArIGFbMTRdO1xuICAgIG91dFsxNV0gPSBhWzNdICogeCArIGFbN10gKiB5ICsgYVsxMV0gKiB6ICsgYVsxNV07XG4gIH0gZWxzZSB7XG4gICAgYTAwID0gYVswXTtcbiAgICBhMDEgPSBhWzFdO1xuICAgIGEwMiA9IGFbMl07XG4gICAgYTAzID0gYVszXTtcbiAgICBhMTAgPSBhWzRdO1xuICAgIGExMSA9IGFbNV07XG4gICAgYTEyID0gYVs2XTtcbiAgICBhMTMgPSBhWzddO1xuICAgIGEyMCA9IGFbOF07XG4gICAgYTIxID0gYVs5XTtcbiAgICBhMjIgPSBhWzEwXTtcbiAgICBhMjMgPSBhWzExXTtcbiAgICBvdXRbMF0gPSBhMDA7XG4gICAgb3V0WzFdID0gYTAxO1xuICAgIG91dFsyXSA9IGEwMjtcbiAgICBvdXRbM10gPSBhMDM7XG4gICAgb3V0WzRdID0gYTEwO1xuICAgIG91dFs1XSA9IGExMTtcbiAgICBvdXRbNl0gPSBhMTI7XG4gICAgb3V0WzddID0gYTEzO1xuICAgIG91dFs4XSA9IGEyMDtcbiAgICBvdXRbOV0gPSBhMjE7XG4gICAgb3V0WzEwXSA9IGEyMjtcbiAgICBvdXRbMTFdID0gYTIzO1xuICAgIG91dFsxMl0gPSBhMDAgKiB4ICsgYTEwICogeSArIGEyMCAqIHogKyBhWzEyXTtcbiAgICBvdXRbMTNdID0gYTAxICogeCArIGExMSAqIHkgKyBhMjEgKiB6ICsgYVsxM107XG4gICAgb3V0WzE0XSA9IGEwMiAqIHggKyBhMTIgKiB5ICsgYTIyICogeiArIGFbMTRdO1xuICAgIG91dFsxNV0gPSBhMDMgKiB4ICsgYTEzICogeSArIGEyMyAqIHogKyBhWzE1XTtcbiAgfVxuXG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogU2NhbGVzIHRoZSBtYXQ0IGJ5IHRoZSBkaW1lbnNpb25zIGluIHRoZSBnaXZlbiB2ZWMzIG5vdCB1c2luZyB2ZWN0b3JpemF0aW9uXHJcbiAqXHJcbiAqIEBwYXJhbSB7bWF0NH0gb3V0IHRoZSByZWNlaXZpbmcgbWF0cml4XHJcbiAqIEBwYXJhbSB7bWF0NH0gYSB0aGUgbWF0cml4IHRvIHNjYWxlXHJcbiAqIEBwYXJhbSB7dmVjM30gdiB0aGUgdmVjMyB0byBzY2FsZSB0aGUgbWF0cml4IGJ5XHJcbiAqIEByZXR1cm5zIHttYXQ0fSBvdXRcclxuICoqL1xuXG5cbmZ1bmN0aW9uIHNjYWxlKG91dCwgYSwgdikge1xuICB2YXIgeCA9IHZbMF0sXG4gICAgICB5ID0gdlsxXSxcbiAgICAgIHogPSB2WzJdO1xuICBvdXRbMF0gPSBhWzBdICogeDtcbiAgb3V0WzFdID0gYVsxXSAqIHg7XG4gIG91dFsyXSA9IGFbMl0gKiB4O1xuICBvdXRbM10gPSBhWzNdICogeDtcbiAgb3V0WzRdID0gYVs0XSAqIHk7XG4gIG91dFs1XSA9IGFbNV0gKiB5O1xuICBvdXRbNl0gPSBhWzZdICogeTtcbiAgb3V0WzddID0gYVs3XSAqIHk7XG4gIG91dFs4XSA9IGFbOF0gKiB6O1xuICBvdXRbOV0gPSBhWzldICogejtcbiAgb3V0WzEwXSA9IGFbMTBdICogejtcbiAgb3V0WzExXSA9IGFbMTFdICogejtcbiAgb3V0WzEyXSA9IGFbMTJdO1xuICBvdXRbMTNdID0gYVsxM107XG4gIG91dFsxNF0gPSBhWzE0XTtcbiAgb3V0WzE1XSA9IGFbMTVdO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIFJvdGF0ZXMgYSBtYXQ0IGJ5IHRoZSBnaXZlbiBhbmdsZSBhcm91bmQgdGhlIGdpdmVuIGF4aXNcclxuICpcclxuICogQHBhcmFtIHttYXQ0fSBvdXQgdGhlIHJlY2VpdmluZyBtYXRyaXhcclxuICogQHBhcmFtIHttYXQ0fSBhIHRoZSBtYXRyaXggdG8gcm90YXRlXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSByYWQgdGhlIGFuZ2xlIHRvIHJvdGF0ZSB0aGUgbWF0cml4IGJ5XHJcbiAqIEBwYXJhbSB7dmVjM30gYXhpcyB0aGUgYXhpcyB0byByb3RhdGUgYXJvdW5kXHJcbiAqIEByZXR1cm5zIHttYXQ0fSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gcm90YXRlKG91dCwgYSwgcmFkLCBheGlzKSB7XG4gIHZhciB4ID0gYXhpc1swXSxcbiAgICAgIHkgPSBheGlzWzFdLFxuICAgICAgeiA9IGF4aXNbMl07XG4gIHZhciBsZW4gPSBNYXRoLmh5cG90KHgsIHksIHopO1xuICB2YXIgcywgYywgdDtcbiAgdmFyIGEwMCwgYTAxLCBhMDIsIGEwMztcbiAgdmFyIGExMCwgYTExLCBhMTIsIGExMztcbiAgdmFyIGEyMCwgYTIxLCBhMjIsIGEyMztcbiAgdmFyIGIwMCwgYjAxLCBiMDI7XG4gIHZhciBiMTAsIGIxMSwgYjEyO1xuICB2YXIgYjIwLCBiMjEsIGIyMjtcblxuICBpZiAobGVuIDwgZ2xNYXRyaXguRVBTSUxPTikge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgbGVuID0gMSAvIGxlbjtcbiAgeCAqPSBsZW47XG4gIHkgKj0gbGVuO1xuICB6ICo9IGxlbjtcbiAgcyA9IE1hdGguc2luKHJhZCk7XG4gIGMgPSBNYXRoLmNvcyhyYWQpO1xuICB0ID0gMSAtIGM7XG4gIGEwMCA9IGFbMF07XG4gIGEwMSA9IGFbMV07XG4gIGEwMiA9IGFbMl07XG4gIGEwMyA9IGFbM107XG4gIGExMCA9IGFbNF07XG4gIGExMSA9IGFbNV07XG4gIGExMiA9IGFbNl07XG4gIGExMyA9IGFbN107XG4gIGEyMCA9IGFbOF07XG4gIGEyMSA9IGFbOV07XG4gIGEyMiA9IGFbMTBdO1xuICBhMjMgPSBhWzExXTsgLy8gQ29uc3RydWN0IHRoZSBlbGVtZW50cyBvZiB0aGUgcm90YXRpb24gbWF0cml4XG5cbiAgYjAwID0geCAqIHggKiB0ICsgYztcbiAgYjAxID0geSAqIHggKiB0ICsgeiAqIHM7XG4gIGIwMiA9IHogKiB4ICogdCAtIHkgKiBzO1xuICBiMTAgPSB4ICogeSAqIHQgLSB6ICogcztcbiAgYjExID0geSAqIHkgKiB0ICsgYztcbiAgYjEyID0geiAqIHkgKiB0ICsgeCAqIHM7XG4gIGIyMCA9IHggKiB6ICogdCArIHkgKiBzO1xuICBiMjEgPSB5ICogeiAqIHQgLSB4ICogcztcbiAgYjIyID0geiAqIHogKiB0ICsgYzsgLy8gUGVyZm9ybSByb3RhdGlvbi1zcGVjaWZpYyBtYXRyaXggbXVsdGlwbGljYXRpb25cblxuICBvdXRbMF0gPSBhMDAgKiBiMDAgKyBhMTAgKiBiMDEgKyBhMjAgKiBiMDI7XG4gIG91dFsxXSA9IGEwMSAqIGIwMCArIGExMSAqIGIwMSArIGEyMSAqIGIwMjtcbiAgb3V0WzJdID0gYTAyICogYjAwICsgYTEyICogYjAxICsgYTIyICogYjAyO1xuICBvdXRbM10gPSBhMDMgKiBiMDAgKyBhMTMgKiBiMDEgKyBhMjMgKiBiMDI7XG4gIG91dFs0XSA9IGEwMCAqIGIxMCArIGExMCAqIGIxMSArIGEyMCAqIGIxMjtcbiAgb3V0WzVdID0gYTAxICogYjEwICsgYTExICogYjExICsgYTIxICogYjEyO1xuICBvdXRbNl0gPSBhMDIgKiBiMTAgKyBhMTIgKiBiMTEgKyBhMjIgKiBiMTI7XG4gIG91dFs3XSA9IGEwMyAqIGIxMCArIGExMyAqIGIxMSArIGEyMyAqIGIxMjtcbiAgb3V0WzhdID0gYTAwICogYjIwICsgYTEwICogYjIxICsgYTIwICogYjIyO1xuICBvdXRbOV0gPSBhMDEgKiBiMjAgKyBhMTEgKiBiMjEgKyBhMjEgKiBiMjI7XG4gIG91dFsxMF0gPSBhMDIgKiBiMjAgKyBhMTIgKiBiMjEgKyBhMjIgKiBiMjI7XG4gIG91dFsxMV0gPSBhMDMgKiBiMjAgKyBhMTMgKiBiMjEgKyBhMjMgKiBiMjI7XG5cbiAgaWYgKGEgIT09IG91dCkge1xuICAgIC8vIElmIHRoZSBzb3VyY2UgYW5kIGRlc3RpbmF0aW9uIGRpZmZlciwgY29weSB0aGUgdW5jaGFuZ2VkIGxhc3Qgcm93XG4gICAgb3V0WzEyXSA9IGFbMTJdO1xuICAgIG91dFsxM10gPSBhWzEzXTtcbiAgICBvdXRbMTRdID0gYVsxNF07XG4gICAgb3V0WzE1XSA9IGFbMTVdO1xuICB9XG5cbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBSb3RhdGVzIGEgbWF0cml4IGJ5IHRoZSBnaXZlbiBhbmdsZSBhcm91bmQgdGhlIFggYXhpc1xyXG4gKlxyXG4gKiBAcGFyYW0ge21hdDR9IG91dCB0aGUgcmVjZWl2aW5nIG1hdHJpeFxyXG4gKiBAcGFyYW0ge21hdDR9IGEgdGhlIG1hdHJpeCB0byByb3RhdGVcclxuICogQHBhcmFtIHtOdW1iZXJ9IHJhZCB0aGUgYW5nbGUgdG8gcm90YXRlIHRoZSBtYXRyaXggYnlcclxuICogQHJldHVybnMge21hdDR9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiByb3RhdGVYKG91dCwgYSwgcmFkKSB7XG4gIHZhciBzID0gTWF0aC5zaW4ocmFkKTtcbiAgdmFyIGMgPSBNYXRoLmNvcyhyYWQpO1xuICB2YXIgYTEwID0gYVs0XTtcbiAgdmFyIGExMSA9IGFbNV07XG4gIHZhciBhMTIgPSBhWzZdO1xuICB2YXIgYTEzID0gYVs3XTtcbiAgdmFyIGEyMCA9IGFbOF07XG4gIHZhciBhMjEgPSBhWzldO1xuICB2YXIgYTIyID0gYVsxMF07XG4gIHZhciBhMjMgPSBhWzExXTtcblxuICBpZiAoYSAhPT0gb3V0KSB7XG4gICAgLy8gSWYgdGhlIHNvdXJjZSBhbmQgZGVzdGluYXRpb24gZGlmZmVyLCBjb3B5IHRoZSB1bmNoYW5nZWQgcm93c1xuICAgIG91dFswXSA9IGFbMF07XG4gICAgb3V0WzFdID0gYVsxXTtcbiAgICBvdXRbMl0gPSBhWzJdO1xuICAgIG91dFszXSA9IGFbM107XG4gICAgb3V0WzEyXSA9IGFbMTJdO1xuICAgIG91dFsxM10gPSBhWzEzXTtcbiAgICBvdXRbMTRdID0gYVsxNF07XG4gICAgb3V0WzE1XSA9IGFbMTVdO1xuICB9IC8vIFBlcmZvcm0gYXhpcy1zcGVjaWZpYyBtYXRyaXggbXVsdGlwbGljYXRpb25cblxuXG4gIG91dFs0XSA9IGExMCAqIGMgKyBhMjAgKiBzO1xuICBvdXRbNV0gPSBhMTEgKiBjICsgYTIxICogcztcbiAgb3V0WzZdID0gYTEyICogYyArIGEyMiAqIHM7XG4gIG91dFs3XSA9IGExMyAqIGMgKyBhMjMgKiBzO1xuICBvdXRbOF0gPSBhMjAgKiBjIC0gYTEwICogcztcbiAgb3V0WzldID0gYTIxICogYyAtIGExMSAqIHM7XG4gIG91dFsxMF0gPSBhMjIgKiBjIC0gYTEyICogcztcbiAgb3V0WzExXSA9IGEyMyAqIGMgLSBhMTMgKiBzO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIFJvdGF0ZXMgYSBtYXRyaXggYnkgdGhlIGdpdmVuIGFuZ2xlIGFyb3VuZCB0aGUgWSBheGlzXHJcbiAqXHJcbiAqIEBwYXJhbSB7bWF0NH0gb3V0IHRoZSByZWNlaXZpbmcgbWF0cml4XHJcbiAqIEBwYXJhbSB7bWF0NH0gYSB0aGUgbWF0cml4IHRvIHJvdGF0ZVxyXG4gKiBAcGFyYW0ge051bWJlcn0gcmFkIHRoZSBhbmdsZSB0byByb3RhdGUgdGhlIG1hdHJpeCBieVxyXG4gKiBAcmV0dXJucyB7bWF0NH0gb3V0XHJcbiAqL1xuXG5cbmZ1bmN0aW9uIHJvdGF0ZVkob3V0LCBhLCByYWQpIHtcbiAgdmFyIHMgPSBNYXRoLnNpbihyYWQpO1xuICB2YXIgYyA9IE1hdGguY29zKHJhZCk7XG4gIHZhciBhMDAgPSBhWzBdO1xuICB2YXIgYTAxID0gYVsxXTtcbiAgdmFyIGEwMiA9IGFbMl07XG4gIHZhciBhMDMgPSBhWzNdO1xuICB2YXIgYTIwID0gYVs4XTtcbiAgdmFyIGEyMSA9IGFbOV07XG4gIHZhciBhMjIgPSBhWzEwXTtcbiAgdmFyIGEyMyA9IGFbMTFdO1xuXG4gIGlmIChhICE9PSBvdXQpIHtcbiAgICAvLyBJZiB0aGUgc291cmNlIGFuZCBkZXN0aW5hdGlvbiBkaWZmZXIsIGNvcHkgdGhlIHVuY2hhbmdlZCByb3dzXG4gICAgb3V0WzRdID0gYVs0XTtcbiAgICBvdXRbNV0gPSBhWzVdO1xuICAgIG91dFs2XSA9IGFbNl07XG4gICAgb3V0WzddID0gYVs3XTtcbiAgICBvdXRbMTJdID0gYVsxMl07XG4gICAgb3V0WzEzXSA9IGFbMTNdO1xuICAgIG91dFsxNF0gPSBhWzE0XTtcbiAgICBvdXRbMTVdID0gYVsxNV07XG4gIH0gLy8gUGVyZm9ybSBheGlzLXNwZWNpZmljIG1hdHJpeCBtdWx0aXBsaWNhdGlvblxuXG5cbiAgb3V0WzBdID0gYTAwICogYyAtIGEyMCAqIHM7XG4gIG91dFsxXSA9IGEwMSAqIGMgLSBhMjEgKiBzO1xuICBvdXRbMl0gPSBhMDIgKiBjIC0gYTIyICogcztcbiAgb3V0WzNdID0gYTAzICogYyAtIGEyMyAqIHM7XG4gIG91dFs4XSA9IGEwMCAqIHMgKyBhMjAgKiBjO1xuICBvdXRbOV0gPSBhMDEgKiBzICsgYTIxICogYztcbiAgb3V0WzEwXSA9IGEwMiAqIHMgKyBhMjIgKiBjO1xuICBvdXRbMTFdID0gYTAzICogcyArIGEyMyAqIGM7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogUm90YXRlcyBhIG1hdHJpeCBieSB0aGUgZ2l2ZW4gYW5nbGUgYXJvdW5kIHRoZSBaIGF4aXNcclxuICpcclxuICogQHBhcmFtIHttYXQ0fSBvdXQgdGhlIHJlY2VpdmluZyBtYXRyaXhcclxuICogQHBhcmFtIHttYXQ0fSBhIHRoZSBtYXRyaXggdG8gcm90YXRlXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSByYWQgdGhlIGFuZ2xlIHRvIHJvdGF0ZSB0aGUgbWF0cml4IGJ5XHJcbiAqIEByZXR1cm5zIHttYXQ0fSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gcm90YXRlWihvdXQsIGEsIHJhZCkge1xuICB2YXIgcyA9IE1hdGguc2luKHJhZCk7XG4gIHZhciBjID0gTWF0aC5jb3MocmFkKTtcbiAgdmFyIGEwMCA9IGFbMF07XG4gIHZhciBhMDEgPSBhWzFdO1xuICB2YXIgYTAyID0gYVsyXTtcbiAgdmFyIGEwMyA9IGFbM107XG4gIHZhciBhMTAgPSBhWzRdO1xuICB2YXIgYTExID0gYVs1XTtcbiAgdmFyIGExMiA9IGFbNl07XG4gIHZhciBhMTMgPSBhWzddO1xuXG4gIGlmIChhICE9PSBvdXQpIHtcbiAgICAvLyBJZiB0aGUgc291cmNlIGFuZCBkZXN0aW5hdGlvbiBkaWZmZXIsIGNvcHkgdGhlIHVuY2hhbmdlZCBsYXN0IHJvd1xuICAgIG91dFs4XSA9IGFbOF07XG4gICAgb3V0WzldID0gYVs5XTtcbiAgICBvdXRbMTBdID0gYVsxMF07XG4gICAgb3V0WzExXSA9IGFbMTFdO1xuICAgIG91dFsxMl0gPSBhWzEyXTtcbiAgICBvdXRbMTNdID0gYVsxM107XG4gICAgb3V0WzE0XSA9IGFbMTRdO1xuICAgIG91dFsxNV0gPSBhWzE1XTtcbiAgfSAvLyBQZXJmb3JtIGF4aXMtc3BlY2lmaWMgbWF0cml4IG11bHRpcGxpY2F0aW9uXG5cblxuICBvdXRbMF0gPSBhMDAgKiBjICsgYTEwICogcztcbiAgb3V0WzFdID0gYTAxICogYyArIGExMSAqIHM7XG4gIG91dFsyXSA9IGEwMiAqIGMgKyBhMTIgKiBzO1xuICBvdXRbM10gPSBhMDMgKiBjICsgYTEzICogcztcbiAgb3V0WzRdID0gYTEwICogYyAtIGEwMCAqIHM7XG4gIG91dFs1XSA9IGExMSAqIGMgLSBhMDEgKiBzO1xuICBvdXRbNl0gPSBhMTIgKiBjIC0gYTAyICogcztcbiAgb3V0WzddID0gYTEzICogYyAtIGEwMyAqIHM7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogQ3JlYXRlcyBhIG1hdHJpeCBmcm9tIGEgdmVjdG9yIHRyYW5zbGF0aW9uXHJcbiAqIFRoaXMgaXMgZXF1aXZhbGVudCB0byAoYnV0IG11Y2ggZmFzdGVyIHRoYW4pOlxyXG4gKlxyXG4gKiAgICAgbWF0NC5pZGVudGl0eShkZXN0KTtcclxuICogICAgIG1hdDQudHJhbnNsYXRlKGRlc3QsIGRlc3QsIHZlYyk7XHJcbiAqXHJcbiAqIEBwYXJhbSB7bWF0NH0gb3V0IG1hdDQgcmVjZWl2aW5nIG9wZXJhdGlvbiByZXN1bHRcclxuICogQHBhcmFtIHt2ZWMzfSB2IFRyYW5zbGF0aW9uIHZlY3RvclxyXG4gKiBAcmV0dXJucyB7bWF0NH0gb3V0XHJcbiAqL1xuXG5cbmZ1bmN0aW9uIGZyb21UcmFuc2xhdGlvbihvdXQsIHYpIHtcbiAgb3V0WzBdID0gMTtcbiAgb3V0WzFdID0gMDtcbiAgb3V0WzJdID0gMDtcbiAgb3V0WzNdID0gMDtcbiAgb3V0WzRdID0gMDtcbiAgb3V0WzVdID0gMTtcbiAgb3V0WzZdID0gMDtcbiAgb3V0WzddID0gMDtcbiAgb3V0WzhdID0gMDtcbiAgb3V0WzldID0gMDtcbiAgb3V0WzEwXSA9IDE7XG4gIG91dFsxMV0gPSAwO1xuICBvdXRbMTJdID0gdlswXTtcbiAgb3V0WzEzXSA9IHZbMV07XG4gIG91dFsxNF0gPSB2WzJdO1xuICBvdXRbMTVdID0gMTtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBDcmVhdGVzIGEgbWF0cml4IGZyb20gYSB2ZWN0b3Igc2NhbGluZ1xyXG4gKiBUaGlzIGlzIGVxdWl2YWxlbnQgdG8gKGJ1dCBtdWNoIGZhc3RlciB0aGFuKTpcclxuICpcclxuICogICAgIG1hdDQuaWRlbnRpdHkoZGVzdCk7XHJcbiAqICAgICBtYXQ0LnNjYWxlKGRlc3QsIGRlc3QsIHZlYyk7XHJcbiAqXHJcbiAqIEBwYXJhbSB7bWF0NH0gb3V0IG1hdDQgcmVjZWl2aW5nIG9wZXJhdGlvbiByZXN1bHRcclxuICogQHBhcmFtIHt2ZWMzfSB2IFNjYWxpbmcgdmVjdG9yXHJcbiAqIEByZXR1cm5zIHttYXQ0fSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gZnJvbVNjYWxpbmcob3V0LCB2KSB7XG4gIG91dFswXSA9IHZbMF07XG4gIG91dFsxXSA9IDA7XG4gIG91dFsyXSA9IDA7XG4gIG91dFszXSA9IDA7XG4gIG91dFs0XSA9IDA7XG4gIG91dFs1XSA9IHZbMV07XG4gIG91dFs2XSA9IDA7XG4gIG91dFs3XSA9IDA7XG4gIG91dFs4XSA9IDA7XG4gIG91dFs5XSA9IDA7XG4gIG91dFsxMF0gPSB2WzJdO1xuICBvdXRbMTFdID0gMDtcbiAgb3V0WzEyXSA9IDA7XG4gIG91dFsxM10gPSAwO1xuICBvdXRbMTRdID0gMDtcbiAgb3V0WzE1XSA9IDE7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogQ3JlYXRlcyBhIG1hdHJpeCBmcm9tIGEgZ2l2ZW4gYW5nbGUgYXJvdW5kIGEgZ2l2ZW4gYXhpc1xyXG4gKiBUaGlzIGlzIGVxdWl2YWxlbnQgdG8gKGJ1dCBtdWNoIGZhc3RlciB0aGFuKTpcclxuICpcclxuICogICAgIG1hdDQuaWRlbnRpdHkoZGVzdCk7XHJcbiAqICAgICBtYXQ0LnJvdGF0ZShkZXN0LCBkZXN0LCByYWQsIGF4aXMpO1xyXG4gKlxyXG4gKiBAcGFyYW0ge21hdDR9IG91dCBtYXQ0IHJlY2VpdmluZyBvcGVyYXRpb24gcmVzdWx0XHJcbiAqIEBwYXJhbSB7TnVtYmVyfSByYWQgdGhlIGFuZ2xlIHRvIHJvdGF0ZSB0aGUgbWF0cml4IGJ5XHJcbiAqIEBwYXJhbSB7dmVjM30gYXhpcyB0aGUgYXhpcyB0byByb3RhdGUgYXJvdW5kXHJcbiAqIEByZXR1cm5zIHttYXQ0fSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gZnJvbVJvdGF0aW9uKG91dCwgcmFkLCBheGlzKSB7XG4gIHZhciB4ID0gYXhpc1swXSxcbiAgICAgIHkgPSBheGlzWzFdLFxuICAgICAgeiA9IGF4aXNbMl07XG4gIHZhciBsZW4gPSBNYXRoLmh5cG90KHgsIHksIHopO1xuICB2YXIgcywgYywgdDtcblxuICBpZiAobGVuIDwgZ2xNYXRyaXguRVBTSUxPTikge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgbGVuID0gMSAvIGxlbjtcbiAgeCAqPSBsZW47XG4gIHkgKj0gbGVuO1xuICB6ICo9IGxlbjtcbiAgcyA9IE1hdGguc2luKHJhZCk7XG4gIGMgPSBNYXRoLmNvcyhyYWQpO1xuICB0ID0gMSAtIGM7IC8vIFBlcmZvcm0gcm90YXRpb24tc3BlY2lmaWMgbWF0cml4IG11bHRpcGxpY2F0aW9uXG5cbiAgb3V0WzBdID0geCAqIHggKiB0ICsgYztcbiAgb3V0WzFdID0geSAqIHggKiB0ICsgeiAqIHM7XG4gIG91dFsyXSA9IHogKiB4ICogdCAtIHkgKiBzO1xuICBvdXRbM10gPSAwO1xuICBvdXRbNF0gPSB4ICogeSAqIHQgLSB6ICogcztcbiAgb3V0WzVdID0geSAqIHkgKiB0ICsgYztcbiAgb3V0WzZdID0geiAqIHkgKiB0ICsgeCAqIHM7XG4gIG91dFs3XSA9IDA7XG4gIG91dFs4XSA9IHggKiB6ICogdCArIHkgKiBzO1xuICBvdXRbOV0gPSB5ICogeiAqIHQgLSB4ICogcztcbiAgb3V0WzEwXSA9IHogKiB6ICogdCArIGM7XG4gIG91dFsxMV0gPSAwO1xuICBvdXRbMTJdID0gMDtcbiAgb3V0WzEzXSA9IDA7XG4gIG91dFsxNF0gPSAwO1xuICBvdXRbMTVdID0gMTtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBDcmVhdGVzIGEgbWF0cml4IGZyb20gdGhlIGdpdmVuIGFuZ2xlIGFyb3VuZCB0aGUgWCBheGlzXHJcbiAqIFRoaXMgaXMgZXF1aXZhbGVudCB0byAoYnV0IG11Y2ggZmFzdGVyIHRoYW4pOlxyXG4gKlxyXG4gKiAgICAgbWF0NC5pZGVudGl0eShkZXN0KTtcclxuICogICAgIG1hdDQucm90YXRlWChkZXN0LCBkZXN0LCByYWQpO1xyXG4gKlxyXG4gKiBAcGFyYW0ge21hdDR9IG91dCBtYXQ0IHJlY2VpdmluZyBvcGVyYXRpb24gcmVzdWx0XHJcbiAqIEBwYXJhbSB7TnVtYmVyfSByYWQgdGhlIGFuZ2xlIHRvIHJvdGF0ZSB0aGUgbWF0cml4IGJ5XHJcbiAqIEByZXR1cm5zIHttYXQ0fSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gZnJvbVhSb3RhdGlvbihvdXQsIHJhZCkge1xuICB2YXIgcyA9IE1hdGguc2luKHJhZCk7XG4gIHZhciBjID0gTWF0aC5jb3MocmFkKTsgLy8gUGVyZm9ybSBheGlzLXNwZWNpZmljIG1hdHJpeCBtdWx0aXBsaWNhdGlvblxuXG4gIG91dFswXSA9IDE7XG4gIG91dFsxXSA9IDA7XG4gIG91dFsyXSA9IDA7XG4gIG91dFszXSA9IDA7XG4gIG91dFs0XSA9IDA7XG4gIG91dFs1XSA9IGM7XG4gIG91dFs2XSA9IHM7XG4gIG91dFs3XSA9IDA7XG4gIG91dFs4XSA9IDA7XG4gIG91dFs5XSA9IC1zO1xuICBvdXRbMTBdID0gYztcbiAgb3V0WzExXSA9IDA7XG4gIG91dFsxMl0gPSAwO1xuICBvdXRbMTNdID0gMDtcbiAgb3V0WzE0XSA9IDA7XG4gIG91dFsxNV0gPSAxO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIENyZWF0ZXMgYSBtYXRyaXggZnJvbSB0aGUgZ2l2ZW4gYW5nbGUgYXJvdW5kIHRoZSBZIGF4aXNcclxuICogVGhpcyBpcyBlcXVpdmFsZW50IHRvIChidXQgbXVjaCBmYXN0ZXIgdGhhbik6XHJcbiAqXHJcbiAqICAgICBtYXQ0LmlkZW50aXR5KGRlc3QpO1xyXG4gKiAgICAgbWF0NC5yb3RhdGVZKGRlc3QsIGRlc3QsIHJhZCk7XHJcbiAqXHJcbiAqIEBwYXJhbSB7bWF0NH0gb3V0IG1hdDQgcmVjZWl2aW5nIG9wZXJhdGlvbiByZXN1bHRcclxuICogQHBhcmFtIHtOdW1iZXJ9IHJhZCB0aGUgYW5nbGUgdG8gcm90YXRlIHRoZSBtYXRyaXggYnlcclxuICogQHJldHVybnMge21hdDR9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBmcm9tWVJvdGF0aW9uKG91dCwgcmFkKSB7XG4gIHZhciBzID0gTWF0aC5zaW4ocmFkKTtcbiAgdmFyIGMgPSBNYXRoLmNvcyhyYWQpOyAvLyBQZXJmb3JtIGF4aXMtc3BlY2lmaWMgbWF0cml4IG11bHRpcGxpY2F0aW9uXG5cbiAgb3V0WzBdID0gYztcbiAgb3V0WzFdID0gMDtcbiAgb3V0WzJdID0gLXM7XG4gIG91dFszXSA9IDA7XG4gIG91dFs0XSA9IDA7XG4gIG91dFs1XSA9IDE7XG4gIG91dFs2XSA9IDA7XG4gIG91dFs3XSA9IDA7XG4gIG91dFs4XSA9IHM7XG4gIG91dFs5XSA9IDA7XG4gIG91dFsxMF0gPSBjO1xuICBvdXRbMTFdID0gMDtcbiAgb3V0WzEyXSA9IDA7XG4gIG91dFsxM10gPSAwO1xuICBvdXRbMTRdID0gMDtcbiAgb3V0WzE1XSA9IDE7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogQ3JlYXRlcyBhIG1hdHJpeCBmcm9tIHRoZSBnaXZlbiBhbmdsZSBhcm91bmQgdGhlIFogYXhpc1xyXG4gKiBUaGlzIGlzIGVxdWl2YWxlbnQgdG8gKGJ1dCBtdWNoIGZhc3RlciB0aGFuKTpcclxuICpcclxuICogICAgIG1hdDQuaWRlbnRpdHkoZGVzdCk7XHJcbiAqICAgICBtYXQ0LnJvdGF0ZVooZGVzdCwgZGVzdCwgcmFkKTtcclxuICpcclxuICogQHBhcmFtIHttYXQ0fSBvdXQgbWF0NCByZWNlaXZpbmcgb3BlcmF0aW9uIHJlc3VsdFxyXG4gKiBAcGFyYW0ge051bWJlcn0gcmFkIHRoZSBhbmdsZSB0byByb3RhdGUgdGhlIG1hdHJpeCBieVxyXG4gKiBAcmV0dXJucyB7bWF0NH0gb3V0XHJcbiAqL1xuXG5cbmZ1bmN0aW9uIGZyb21aUm90YXRpb24ob3V0LCByYWQpIHtcbiAgdmFyIHMgPSBNYXRoLnNpbihyYWQpO1xuICB2YXIgYyA9IE1hdGguY29zKHJhZCk7IC8vIFBlcmZvcm0gYXhpcy1zcGVjaWZpYyBtYXRyaXggbXVsdGlwbGljYXRpb25cblxuICBvdXRbMF0gPSBjO1xuICBvdXRbMV0gPSBzO1xuICBvdXRbMl0gPSAwO1xuICBvdXRbM10gPSAwO1xuICBvdXRbNF0gPSAtcztcbiAgb3V0WzVdID0gYztcbiAgb3V0WzZdID0gMDtcbiAgb3V0WzddID0gMDtcbiAgb3V0WzhdID0gMDtcbiAgb3V0WzldID0gMDtcbiAgb3V0WzEwXSA9IDE7XG4gIG91dFsxMV0gPSAwO1xuICBvdXRbMTJdID0gMDtcbiAgb3V0WzEzXSA9IDA7XG4gIG91dFsxNF0gPSAwO1xuICBvdXRbMTVdID0gMTtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBDcmVhdGVzIGEgbWF0cml4IGZyb20gYSBxdWF0ZXJuaW9uIHJvdGF0aW9uIGFuZCB2ZWN0b3IgdHJhbnNsYXRpb25cclxuICogVGhpcyBpcyBlcXVpdmFsZW50IHRvIChidXQgbXVjaCBmYXN0ZXIgdGhhbik6XHJcbiAqXHJcbiAqICAgICBtYXQ0LmlkZW50aXR5KGRlc3QpO1xyXG4gKiAgICAgbWF0NC50cmFuc2xhdGUoZGVzdCwgdmVjKTtcclxuICogICAgIGxldCBxdWF0TWF0ID0gbWF0NC5jcmVhdGUoKTtcclxuICogICAgIHF1YXQ0LnRvTWF0NChxdWF0LCBxdWF0TWF0KTtcclxuICogICAgIG1hdDQubXVsdGlwbHkoZGVzdCwgcXVhdE1hdCk7XHJcbiAqXHJcbiAqIEBwYXJhbSB7bWF0NH0gb3V0IG1hdDQgcmVjZWl2aW5nIG9wZXJhdGlvbiByZXN1bHRcclxuICogQHBhcmFtIHtxdWF0NH0gcSBSb3RhdGlvbiBxdWF0ZXJuaW9uXHJcbiAqIEBwYXJhbSB7dmVjM30gdiBUcmFuc2xhdGlvbiB2ZWN0b3JcclxuICogQHJldHVybnMge21hdDR9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBmcm9tUm90YXRpb25UcmFuc2xhdGlvbihvdXQsIHEsIHYpIHtcbiAgLy8gUXVhdGVybmlvbiBtYXRoXG4gIHZhciB4ID0gcVswXSxcbiAgICAgIHkgPSBxWzFdLFxuICAgICAgeiA9IHFbMl0sXG4gICAgICB3ID0gcVszXTtcbiAgdmFyIHgyID0geCArIHg7XG4gIHZhciB5MiA9IHkgKyB5O1xuICB2YXIgejIgPSB6ICsgejtcbiAgdmFyIHh4ID0geCAqIHgyO1xuICB2YXIgeHkgPSB4ICogeTI7XG4gIHZhciB4eiA9IHggKiB6MjtcbiAgdmFyIHl5ID0geSAqIHkyO1xuICB2YXIgeXogPSB5ICogejI7XG4gIHZhciB6eiA9IHogKiB6MjtcbiAgdmFyIHd4ID0gdyAqIHgyO1xuICB2YXIgd3kgPSB3ICogeTI7XG4gIHZhciB3eiA9IHcgKiB6MjtcbiAgb3V0WzBdID0gMSAtICh5eSArIHp6KTtcbiAgb3V0WzFdID0geHkgKyB3ejtcbiAgb3V0WzJdID0geHogLSB3eTtcbiAgb3V0WzNdID0gMDtcbiAgb3V0WzRdID0geHkgLSB3ejtcbiAgb3V0WzVdID0gMSAtICh4eCArIHp6KTtcbiAgb3V0WzZdID0geXogKyB3eDtcbiAgb3V0WzddID0gMDtcbiAgb3V0WzhdID0geHogKyB3eTtcbiAgb3V0WzldID0geXogLSB3eDtcbiAgb3V0WzEwXSA9IDEgLSAoeHggKyB5eSk7XG4gIG91dFsxMV0gPSAwO1xuICBvdXRbMTJdID0gdlswXTtcbiAgb3V0WzEzXSA9IHZbMV07XG4gIG91dFsxNF0gPSB2WzJdO1xuICBvdXRbMTVdID0gMTtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBDcmVhdGVzIGEgbmV3IG1hdDQgZnJvbSBhIGR1YWwgcXVhdC5cclxuICpcclxuICogQHBhcmFtIHttYXQ0fSBvdXQgTWF0cml4XHJcbiAqIEBwYXJhbSB7cXVhdDJ9IGEgRHVhbCBRdWF0ZXJuaW9uXHJcbiAqIEByZXR1cm5zIHttYXQ0fSBtYXQ0IHJlY2VpdmluZyBvcGVyYXRpb24gcmVzdWx0XHJcbiAqL1xuXG5cbmZ1bmN0aW9uIGZyb21RdWF0MihvdXQsIGEpIHtcbiAgdmFyIHRyYW5zbGF0aW9uID0gbmV3IGdsTWF0cml4LkFSUkFZX1RZUEUoMyk7XG4gIHZhciBieCA9IC1hWzBdLFxuICAgICAgYnkgPSAtYVsxXSxcbiAgICAgIGJ6ID0gLWFbMl0sXG4gICAgICBidyA9IGFbM10sXG4gICAgICBheCA9IGFbNF0sXG4gICAgICBheSA9IGFbNV0sXG4gICAgICBheiA9IGFbNl0sXG4gICAgICBhdyA9IGFbN107XG4gIHZhciBtYWduaXR1ZGUgPSBieCAqIGJ4ICsgYnkgKiBieSArIGJ6ICogYnogKyBidyAqIGJ3OyAvL09ubHkgc2NhbGUgaWYgaXQgbWFrZXMgc2Vuc2VcblxuICBpZiAobWFnbml0dWRlID4gMCkge1xuICAgIHRyYW5zbGF0aW9uWzBdID0gKGF4ICogYncgKyBhdyAqIGJ4ICsgYXkgKiBieiAtIGF6ICogYnkpICogMiAvIG1hZ25pdHVkZTtcbiAgICB0cmFuc2xhdGlvblsxXSA9IChheSAqIGJ3ICsgYXcgKiBieSArIGF6ICogYnggLSBheCAqIGJ6KSAqIDIgLyBtYWduaXR1ZGU7XG4gICAgdHJhbnNsYXRpb25bMl0gPSAoYXogKiBidyArIGF3ICogYnogKyBheCAqIGJ5IC0gYXkgKiBieCkgKiAyIC8gbWFnbml0dWRlO1xuICB9IGVsc2Uge1xuICAgIHRyYW5zbGF0aW9uWzBdID0gKGF4ICogYncgKyBhdyAqIGJ4ICsgYXkgKiBieiAtIGF6ICogYnkpICogMjtcbiAgICB0cmFuc2xhdGlvblsxXSA9IChheSAqIGJ3ICsgYXcgKiBieSArIGF6ICogYnggLSBheCAqIGJ6KSAqIDI7XG4gICAgdHJhbnNsYXRpb25bMl0gPSAoYXogKiBidyArIGF3ICogYnogKyBheCAqIGJ5IC0gYXkgKiBieCkgKiAyO1xuICB9XG5cbiAgZnJvbVJvdGF0aW9uVHJhbnNsYXRpb24ob3V0LCBhLCB0cmFuc2xhdGlvbik7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogUmV0dXJucyB0aGUgdHJhbnNsYXRpb24gdmVjdG9yIGNvbXBvbmVudCBvZiBhIHRyYW5zZm9ybWF0aW9uXHJcbiAqICBtYXRyaXguIElmIGEgbWF0cml4IGlzIGJ1aWx0IHdpdGggZnJvbVJvdGF0aW9uVHJhbnNsYXRpb24sXHJcbiAqICB0aGUgcmV0dXJuZWQgdmVjdG9yIHdpbGwgYmUgdGhlIHNhbWUgYXMgdGhlIHRyYW5zbGF0aW9uIHZlY3RvclxyXG4gKiAgb3JpZ2luYWxseSBzdXBwbGllZC5cclxuICogQHBhcmFtICB7dmVjM30gb3V0IFZlY3RvciB0byByZWNlaXZlIHRyYW5zbGF0aW9uIGNvbXBvbmVudFxyXG4gKiBAcGFyYW0gIHttYXQ0fSBtYXQgTWF0cml4IHRvIGJlIGRlY29tcG9zZWQgKGlucHV0KVxyXG4gKiBAcmV0dXJuIHt2ZWMzfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gZ2V0VHJhbnNsYXRpb24ob3V0LCBtYXQpIHtcbiAgb3V0WzBdID0gbWF0WzEyXTtcbiAgb3V0WzFdID0gbWF0WzEzXTtcbiAgb3V0WzJdID0gbWF0WzE0XTtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBSZXR1cm5zIHRoZSBzY2FsaW5nIGZhY3RvciBjb21wb25lbnQgb2YgYSB0cmFuc2Zvcm1hdGlvblxyXG4gKiAgbWF0cml4LiBJZiBhIG1hdHJpeCBpcyBidWlsdCB3aXRoIGZyb21Sb3RhdGlvblRyYW5zbGF0aW9uU2NhbGVcclxuICogIHdpdGggYSBub3JtYWxpemVkIFF1YXRlcm5pb24gcGFyYW10ZXIsIHRoZSByZXR1cm5lZCB2ZWN0b3Igd2lsbCBiZVxyXG4gKiAgdGhlIHNhbWUgYXMgdGhlIHNjYWxpbmcgdmVjdG9yXHJcbiAqICBvcmlnaW5hbGx5IHN1cHBsaWVkLlxyXG4gKiBAcGFyYW0gIHt2ZWMzfSBvdXQgVmVjdG9yIHRvIHJlY2VpdmUgc2NhbGluZyBmYWN0b3IgY29tcG9uZW50XHJcbiAqIEBwYXJhbSAge21hdDR9IG1hdCBNYXRyaXggdG8gYmUgZGVjb21wb3NlZCAoaW5wdXQpXHJcbiAqIEByZXR1cm4ge3ZlYzN9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBnZXRTY2FsaW5nKG91dCwgbWF0KSB7XG4gIHZhciBtMTEgPSBtYXRbMF07XG4gIHZhciBtMTIgPSBtYXRbMV07XG4gIHZhciBtMTMgPSBtYXRbMl07XG4gIHZhciBtMjEgPSBtYXRbNF07XG4gIHZhciBtMjIgPSBtYXRbNV07XG4gIHZhciBtMjMgPSBtYXRbNl07XG4gIHZhciBtMzEgPSBtYXRbOF07XG4gIHZhciBtMzIgPSBtYXRbOV07XG4gIHZhciBtMzMgPSBtYXRbMTBdO1xuICBvdXRbMF0gPSBNYXRoLmh5cG90KG0xMSwgbTEyLCBtMTMpO1xuICBvdXRbMV0gPSBNYXRoLmh5cG90KG0yMSwgbTIyLCBtMjMpO1xuICBvdXRbMl0gPSBNYXRoLmh5cG90KG0zMSwgbTMyLCBtMzMpO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIFJldHVybnMgYSBxdWF0ZXJuaW9uIHJlcHJlc2VudGluZyB0aGUgcm90YXRpb25hbCBjb21wb25lbnRcclxuICogIG9mIGEgdHJhbnNmb3JtYXRpb24gbWF0cml4LiBJZiBhIG1hdHJpeCBpcyBidWlsdCB3aXRoXHJcbiAqICBmcm9tUm90YXRpb25UcmFuc2xhdGlvbiwgdGhlIHJldHVybmVkIHF1YXRlcm5pb24gd2lsbCBiZSB0aGVcclxuICogIHNhbWUgYXMgdGhlIHF1YXRlcm5pb24gb3JpZ2luYWxseSBzdXBwbGllZC5cclxuICogQHBhcmFtIHtxdWF0fSBvdXQgUXVhdGVybmlvbiB0byByZWNlaXZlIHRoZSByb3RhdGlvbiBjb21wb25lbnRcclxuICogQHBhcmFtIHttYXQ0fSBtYXQgTWF0cml4IHRvIGJlIGRlY29tcG9zZWQgKGlucHV0KVxyXG4gKiBAcmV0dXJuIHtxdWF0fSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gZ2V0Um90YXRpb24ob3V0LCBtYXQpIHtcbiAgdmFyIHNjYWxpbmcgPSBuZXcgZ2xNYXRyaXguQVJSQVlfVFlQRSgzKTtcbiAgZ2V0U2NhbGluZyhzY2FsaW5nLCBtYXQpO1xuICB2YXIgaXMxID0gMSAvIHNjYWxpbmdbMF07XG4gIHZhciBpczIgPSAxIC8gc2NhbGluZ1sxXTtcbiAgdmFyIGlzMyA9IDEgLyBzY2FsaW5nWzJdO1xuICB2YXIgc20xMSA9IG1hdFswXSAqIGlzMTtcbiAgdmFyIHNtMTIgPSBtYXRbMV0gKiBpczI7XG4gIHZhciBzbTEzID0gbWF0WzJdICogaXMzO1xuICB2YXIgc20yMSA9IG1hdFs0XSAqIGlzMTtcbiAgdmFyIHNtMjIgPSBtYXRbNV0gKiBpczI7XG4gIHZhciBzbTIzID0gbWF0WzZdICogaXMzO1xuICB2YXIgc20zMSA9IG1hdFs4XSAqIGlzMTtcbiAgdmFyIHNtMzIgPSBtYXRbOV0gKiBpczI7XG4gIHZhciBzbTMzID0gbWF0WzEwXSAqIGlzMztcbiAgdmFyIHRyYWNlID0gc20xMSArIHNtMjIgKyBzbTMzO1xuICB2YXIgUyA9IDA7XG5cbiAgaWYgKHRyYWNlID4gMCkge1xuICAgIFMgPSBNYXRoLnNxcnQodHJhY2UgKyAxLjApICogMjtcbiAgICBvdXRbM10gPSAwLjI1ICogUztcbiAgICBvdXRbMF0gPSAoc20yMyAtIHNtMzIpIC8gUztcbiAgICBvdXRbMV0gPSAoc20zMSAtIHNtMTMpIC8gUztcbiAgICBvdXRbMl0gPSAoc20xMiAtIHNtMjEpIC8gUztcbiAgfSBlbHNlIGlmIChzbTExID4gc20yMiAmJiBzbTExID4gc20zMykge1xuICAgIFMgPSBNYXRoLnNxcnQoMS4wICsgc20xMSAtIHNtMjIgLSBzbTMzKSAqIDI7XG4gICAgb3V0WzNdID0gKHNtMjMgLSBzbTMyKSAvIFM7XG4gICAgb3V0WzBdID0gMC4yNSAqIFM7XG4gICAgb3V0WzFdID0gKHNtMTIgKyBzbTIxKSAvIFM7XG4gICAgb3V0WzJdID0gKHNtMzEgKyBzbTEzKSAvIFM7XG4gIH0gZWxzZSBpZiAoc20yMiA+IHNtMzMpIHtcbiAgICBTID0gTWF0aC5zcXJ0KDEuMCArIHNtMjIgLSBzbTExIC0gc20zMykgKiAyO1xuICAgIG91dFszXSA9IChzbTMxIC0gc20xMykgLyBTO1xuICAgIG91dFswXSA9IChzbTEyICsgc20yMSkgLyBTO1xuICAgIG91dFsxXSA9IDAuMjUgKiBTO1xuICAgIG91dFsyXSA9IChzbTIzICsgc20zMikgLyBTO1xuICB9IGVsc2Uge1xuICAgIFMgPSBNYXRoLnNxcnQoMS4wICsgc20zMyAtIHNtMTEgLSBzbTIyKSAqIDI7XG4gICAgb3V0WzNdID0gKHNtMTIgLSBzbTIxKSAvIFM7XG4gICAgb3V0WzBdID0gKHNtMzEgKyBzbTEzKSAvIFM7XG4gICAgb3V0WzFdID0gKHNtMjMgKyBzbTMyKSAvIFM7XG4gICAgb3V0WzJdID0gMC4yNSAqIFM7XG4gIH1cblxuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIENyZWF0ZXMgYSBtYXRyaXggZnJvbSBhIHF1YXRlcm5pb24gcm90YXRpb24sIHZlY3RvciB0cmFuc2xhdGlvbiBhbmQgdmVjdG9yIHNjYWxlXHJcbiAqIFRoaXMgaXMgZXF1aXZhbGVudCB0byAoYnV0IG11Y2ggZmFzdGVyIHRoYW4pOlxyXG4gKlxyXG4gKiAgICAgbWF0NC5pZGVudGl0eShkZXN0KTtcclxuICogICAgIG1hdDQudHJhbnNsYXRlKGRlc3QsIHZlYyk7XHJcbiAqICAgICBsZXQgcXVhdE1hdCA9IG1hdDQuY3JlYXRlKCk7XHJcbiAqICAgICBxdWF0NC50b01hdDQocXVhdCwgcXVhdE1hdCk7XHJcbiAqICAgICBtYXQ0Lm11bHRpcGx5KGRlc3QsIHF1YXRNYXQpO1xyXG4gKiAgICAgbWF0NC5zY2FsZShkZXN0LCBzY2FsZSlcclxuICpcclxuICogQHBhcmFtIHttYXQ0fSBvdXQgbWF0NCByZWNlaXZpbmcgb3BlcmF0aW9uIHJlc3VsdFxyXG4gKiBAcGFyYW0ge3F1YXQ0fSBxIFJvdGF0aW9uIHF1YXRlcm5pb25cclxuICogQHBhcmFtIHt2ZWMzfSB2IFRyYW5zbGF0aW9uIHZlY3RvclxyXG4gKiBAcGFyYW0ge3ZlYzN9IHMgU2NhbGluZyB2ZWN0b3JcclxuICogQHJldHVybnMge21hdDR9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBmcm9tUm90YXRpb25UcmFuc2xhdGlvblNjYWxlKG91dCwgcSwgdiwgcykge1xuICAvLyBRdWF0ZXJuaW9uIG1hdGhcbiAgdmFyIHggPSBxWzBdLFxuICAgICAgeSA9IHFbMV0sXG4gICAgICB6ID0gcVsyXSxcbiAgICAgIHcgPSBxWzNdO1xuICB2YXIgeDIgPSB4ICsgeDtcbiAgdmFyIHkyID0geSArIHk7XG4gIHZhciB6MiA9IHogKyB6O1xuICB2YXIgeHggPSB4ICogeDI7XG4gIHZhciB4eSA9IHggKiB5MjtcbiAgdmFyIHh6ID0geCAqIHoyO1xuICB2YXIgeXkgPSB5ICogeTI7XG4gIHZhciB5eiA9IHkgKiB6MjtcbiAgdmFyIHp6ID0geiAqIHoyO1xuICB2YXIgd3ggPSB3ICogeDI7XG4gIHZhciB3eSA9IHcgKiB5MjtcbiAgdmFyIHd6ID0gdyAqIHoyO1xuICB2YXIgc3ggPSBzWzBdO1xuICB2YXIgc3kgPSBzWzFdO1xuICB2YXIgc3ogPSBzWzJdO1xuICBvdXRbMF0gPSAoMSAtICh5eSArIHp6KSkgKiBzeDtcbiAgb3V0WzFdID0gKHh5ICsgd3opICogc3g7XG4gIG91dFsyXSA9ICh4eiAtIHd5KSAqIHN4O1xuICBvdXRbM10gPSAwO1xuICBvdXRbNF0gPSAoeHkgLSB3eikgKiBzeTtcbiAgb3V0WzVdID0gKDEgLSAoeHggKyB6eikpICogc3k7XG4gIG91dFs2XSA9ICh5eiArIHd4KSAqIHN5O1xuICBvdXRbN10gPSAwO1xuICBvdXRbOF0gPSAoeHogKyB3eSkgKiBzejtcbiAgb3V0WzldID0gKHl6IC0gd3gpICogc3o7XG4gIG91dFsxMF0gPSAoMSAtICh4eCArIHl5KSkgKiBzejtcbiAgb3V0WzExXSA9IDA7XG4gIG91dFsxMl0gPSB2WzBdO1xuICBvdXRbMTNdID0gdlsxXTtcbiAgb3V0WzE0XSA9IHZbMl07XG4gIG91dFsxNV0gPSAxO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIENyZWF0ZXMgYSBtYXRyaXggZnJvbSBhIHF1YXRlcm5pb24gcm90YXRpb24sIHZlY3RvciB0cmFuc2xhdGlvbiBhbmQgdmVjdG9yIHNjYWxlLCByb3RhdGluZyBhbmQgc2NhbGluZyBhcm91bmQgdGhlIGdpdmVuIG9yaWdpblxyXG4gKiBUaGlzIGlzIGVxdWl2YWxlbnQgdG8gKGJ1dCBtdWNoIGZhc3RlciB0aGFuKTpcclxuICpcclxuICogICAgIG1hdDQuaWRlbnRpdHkoZGVzdCk7XHJcbiAqICAgICBtYXQ0LnRyYW5zbGF0ZShkZXN0LCB2ZWMpO1xyXG4gKiAgICAgbWF0NC50cmFuc2xhdGUoZGVzdCwgb3JpZ2luKTtcclxuICogICAgIGxldCBxdWF0TWF0ID0gbWF0NC5jcmVhdGUoKTtcclxuICogICAgIHF1YXQ0LnRvTWF0NChxdWF0LCBxdWF0TWF0KTtcclxuICogICAgIG1hdDQubXVsdGlwbHkoZGVzdCwgcXVhdE1hdCk7XHJcbiAqICAgICBtYXQ0LnNjYWxlKGRlc3QsIHNjYWxlKVxyXG4gKiAgICAgbWF0NC50cmFuc2xhdGUoZGVzdCwgbmVnYXRpdmVPcmlnaW4pO1xyXG4gKlxyXG4gKiBAcGFyYW0ge21hdDR9IG91dCBtYXQ0IHJlY2VpdmluZyBvcGVyYXRpb24gcmVzdWx0XHJcbiAqIEBwYXJhbSB7cXVhdDR9IHEgUm90YXRpb24gcXVhdGVybmlvblxyXG4gKiBAcGFyYW0ge3ZlYzN9IHYgVHJhbnNsYXRpb24gdmVjdG9yXHJcbiAqIEBwYXJhbSB7dmVjM30gcyBTY2FsaW5nIHZlY3RvclxyXG4gKiBAcGFyYW0ge3ZlYzN9IG8gVGhlIG9yaWdpbiB2ZWN0b3IgYXJvdW5kIHdoaWNoIHRvIHNjYWxlIGFuZCByb3RhdGVcclxuICogQHJldHVybnMge21hdDR9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBmcm9tUm90YXRpb25UcmFuc2xhdGlvblNjYWxlT3JpZ2luKG91dCwgcSwgdiwgcywgbykge1xuICAvLyBRdWF0ZXJuaW9uIG1hdGhcbiAgdmFyIHggPSBxWzBdLFxuICAgICAgeSA9IHFbMV0sXG4gICAgICB6ID0gcVsyXSxcbiAgICAgIHcgPSBxWzNdO1xuICB2YXIgeDIgPSB4ICsgeDtcbiAgdmFyIHkyID0geSArIHk7XG4gIHZhciB6MiA9IHogKyB6O1xuICB2YXIgeHggPSB4ICogeDI7XG4gIHZhciB4eSA9IHggKiB5MjtcbiAgdmFyIHh6ID0geCAqIHoyO1xuICB2YXIgeXkgPSB5ICogeTI7XG4gIHZhciB5eiA9IHkgKiB6MjtcbiAgdmFyIHp6ID0geiAqIHoyO1xuICB2YXIgd3ggPSB3ICogeDI7XG4gIHZhciB3eSA9IHcgKiB5MjtcbiAgdmFyIHd6ID0gdyAqIHoyO1xuICB2YXIgc3ggPSBzWzBdO1xuICB2YXIgc3kgPSBzWzFdO1xuICB2YXIgc3ogPSBzWzJdO1xuICB2YXIgb3ggPSBvWzBdO1xuICB2YXIgb3kgPSBvWzFdO1xuICB2YXIgb3ogPSBvWzJdO1xuICB2YXIgb3V0MCA9ICgxIC0gKHl5ICsgenopKSAqIHN4O1xuICB2YXIgb3V0MSA9ICh4eSArIHd6KSAqIHN4O1xuICB2YXIgb3V0MiA9ICh4eiAtIHd5KSAqIHN4O1xuICB2YXIgb3V0NCA9ICh4eSAtIHd6KSAqIHN5O1xuICB2YXIgb3V0NSA9ICgxIC0gKHh4ICsgenopKSAqIHN5O1xuICB2YXIgb3V0NiA9ICh5eiArIHd4KSAqIHN5O1xuICB2YXIgb3V0OCA9ICh4eiArIHd5KSAqIHN6O1xuICB2YXIgb3V0OSA9ICh5eiAtIHd4KSAqIHN6O1xuICB2YXIgb3V0MTAgPSAoMSAtICh4eCArIHl5KSkgKiBzejtcbiAgb3V0WzBdID0gb3V0MDtcbiAgb3V0WzFdID0gb3V0MTtcbiAgb3V0WzJdID0gb3V0MjtcbiAgb3V0WzNdID0gMDtcbiAgb3V0WzRdID0gb3V0NDtcbiAgb3V0WzVdID0gb3V0NTtcbiAgb3V0WzZdID0gb3V0NjtcbiAgb3V0WzddID0gMDtcbiAgb3V0WzhdID0gb3V0ODtcbiAgb3V0WzldID0gb3V0OTtcbiAgb3V0WzEwXSA9IG91dDEwO1xuICBvdXRbMTFdID0gMDtcbiAgb3V0WzEyXSA9IHZbMF0gKyBveCAtIChvdXQwICogb3ggKyBvdXQ0ICogb3kgKyBvdXQ4ICogb3opO1xuICBvdXRbMTNdID0gdlsxXSArIG95IC0gKG91dDEgKiBveCArIG91dDUgKiBveSArIG91dDkgKiBveik7XG4gIG91dFsxNF0gPSB2WzJdICsgb3ogLSAob3V0MiAqIG94ICsgb3V0NiAqIG95ICsgb3V0MTAgKiBveik7XG4gIG91dFsxNV0gPSAxO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIENhbGN1bGF0ZXMgYSA0eDQgbWF0cml4IGZyb20gdGhlIGdpdmVuIHF1YXRlcm5pb25cclxuICpcclxuICogQHBhcmFtIHttYXQ0fSBvdXQgbWF0NCByZWNlaXZpbmcgb3BlcmF0aW9uIHJlc3VsdFxyXG4gKiBAcGFyYW0ge3F1YXR9IHEgUXVhdGVybmlvbiB0byBjcmVhdGUgbWF0cml4IGZyb21cclxuICpcclxuICogQHJldHVybnMge21hdDR9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBmcm9tUXVhdChvdXQsIHEpIHtcbiAgdmFyIHggPSBxWzBdLFxuICAgICAgeSA9IHFbMV0sXG4gICAgICB6ID0gcVsyXSxcbiAgICAgIHcgPSBxWzNdO1xuICB2YXIgeDIgPSB4ICsgeDtcbiAgdmFyIHkyID0geSArIHk7XG4gIHZhciB6MiA9IHogKyB6O1xuICB2YXIgeHggPSB4ICogeDI7XG4gIHZhciB5eCA9IHkgKiB4MjtcbiAgdmFyIHl5ID0geSAqIHkyO1xuICB2YXIgenggPSB6ICogeDI7XG4gIHZhciB6eSA9IHogKiB5MjtcbiAgdmFyIHp6ID0geiAqIHoyO1xuICB2YXIgd3ggPSB3ICogeDI7XG4gIHZhciB3eSA9IHcgKiB5MjtcbiAgdmFyIHd6ID0gdyAqIHoyO1xuICBvdXRbMF0gPSAxIC0geXkgLSB6ejtcbiAgb3V0WzFdID0geXggKyB3ejtcbiAgb3V0WzJdID0genggLSB3eTtcbiAgb3V0WzNdID0gMDtcbiAgb3V0WzRdID0geXggLSB3ejtcbiAgb3V0WzVdID0gMSAtIHh4IC0geno7XG4gIG91dFs2XSA9IHp5ICsgd3g7XG4gIG91dFs3XSA9IDA7XG4gIG91dFs4XSA9IHp4ICsgd3k7XG4gIG91dFs5XSA9IHp5IC0gd3g7XG4gIG91dFsxMF0gPSAxIC0geHggLSB5eTtcbiAgb3V0WzExXSA9IDA7XG4gIG91dFsxMl0gPSAwO1xuICBvdXRbMTNdID0gMDtcbiAgb3V0WzE0XSA9IDA7XG4gIG91dFsxNV0gPSAxO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIEdlbmVyYXRlcyBhIGZydXN0dW0gbWF0cml4IHdpdGggdGhlIGdpdmVuIGJvdW5kc1xyXG4gKlxyXG4gKiBAcGFyYW0ge21hdDR9IG91dCBtYXQ0IGZydXN0dW0gbWF0cml4IHdpbGwgYmUgd3JpdHRlbiBpbnRvXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBsZWZ0IExlZnQgYm91bmQgb2YgdGhlIGZydXN0dW1cclxuICogQHBhcmFtIHtOdW1iZXJ9IHJpZ2h0IFJpZ2h0IGJvdW5kIG9mIHRoZSBmcnVzdHVtXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBib3R0b20gQm90dG9tIGJvdW5kIG9mIHRoZSBmcnVzdHVtXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSB0b3AgVG9wIGJvdW5kIG9mIHRoZSBmcnVzdHVtXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBuZWFyIE5lYXIgYm91bmQgb2YgdGhlIGZydXN0dW1cclxuICogQHBhcmFtIHtOdW1iZXJ9IGZhciBGYXIgYm91bmQgb2YgdGhlIGZydXN0dW1cclxuICogQHJldHVybnMge21hdDR9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBmcnVzdHVtKG91dCwgbGVmdCwgcmlnaHQsIGJvdHRvbSwgdG9wLCBuZWFyLCBmYXIpIHtcbiAgdmFyIHJsID0gMSAvIChyaWdodCAtIGxlZnQpO1xuICB2YXIgdGIgPSAxIC8gKHRvcCAtIGJvdHRvbSk7XG4gIHZhciBuZiA9IDEgLyAobmVhciAtIGZhcik7XG4gIG91dFswXSA9IG5lYXIgKiAyICogcmw7XG4gIG91dFsxXSA9IDA7XG4gIG91dFsyXSA9IDA7XG4gIG91dFszXSA9IDA7XG4gIG91dFs0XSA9IDA7XG4gIG91dFs1XSA9IG5lYXIgKiAyICogdGI7XG4gIG91dFs2XSA9IDA7XG4gIG91dFs3XSA9IDA7XG4gIG91dFs4XSA9IChyaWdodCArIGxlZnQpICogcmw7XG4gIG91dFs5XSA9ICh0b3AgKyBib3R0b20pICogdGI7XG4gIG91dFsxMF0gPSAoZmFyICsgbmVhcikgKiBuZjtcbiAgb3V0WzExXSA9IC0xO1xuICBvdXRbMTJdID0gMDtcbiAgb3V0WzEzXSA9IDA7XG4gIG91dFsxNF0gPSBmYXIgKiBuZWFyICogMiAqIG5mO1xuICBvdXRbMTVdID0gMDtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBHZW5lcmF0ZXMgYSBwZXJzcGVjdGl2ZSBwcm9qZWN0aW9uIG1hdHJpeCB3aXRoIHRoZSBnaXZlbiBib3VuZHMuXHJcbiAqIFBhc3NpbmcgbnVsbC91bmRlZmluZWQvbm8gdmFsdWUgZm9yIGZhciB3aWxsIGdlbmVyYXRlIGluZmluaXRlIHByb2plY3Rpb24gbWF0cml4LlxyXG4gKlxyXG4gKiBAcGFyYW0ge21hdDR9IG91dCBtYXQ0IGZydXN0dW0gbWF0cml4IHdpbGwgYmUgd3JpdHRlbiBpbnRvXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBmb3Z5IFZlcnRpY2FsIGZpZWxkIG9mIHZpZXcgaW4gcmFkaWFuc1xyXG4gKiBAcGFyYW0ge251bWJlcn0gYXNwZWN0IEFzcGVjdCByYXRpby4gdHlwaWNhbGx5IHZpZXdwb3J0IHdpZHRoL2hlaWdodFxyXG4gKiBAcGFyYW0ge251bWJlcn0gbmVhciBOZWFyIGJvdW5kIG9mIHRoZSBmcnVzdHVtXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBmYXIgRmFyIGJvdW5kIG9mIHRoZSBmcnVzdHVtLCBjYW4gYmUgbnVsbCBvciBJbmZpbml0eVxyXG4gKiBAcmV0dXJucyB7bWF0NH0gb3V0XHJcbiAqL1xuXG5cbmZ1bmN0aW9uIHBlcnNwZWN0aXZlKG91dCwgZm92eSwgYXNwZWN0LCBuZWFyLCBmYXIpIHtcbiAgdmFyIGYgPSAxLjAgLyBNYXRoLnRhbihmb3Z5IC8gMiksXG4gICAgICBuZjtcbiAgb3V0WzBdID0gZiAvIGFzcGVjdDtcbiAgb3V0WzFdID0gMDtcbiAgb3V0WzJdID0gMDtcbiAgb3V0WzNdID0gMDtcbiAgb3V0WzRdID0gMDtcbiAgb3V0WzVdID0gZjtcbiAgb3V0WzZdID0gMDtcbiAgb3V0WzddID0gMDtcbiAgb3V0WzhdID0gMDtcbiAgb3V0WzldID0gMDtcbiAgb3V0WzExXSA9IC0xO1xuICBvdXRbMTJdID0gMDtcbiAgb3V0WzEzXSA9IDA7XG4gIG91dFsxNV0gPSAwO1xuXG4gIGlmIChmYXIgIT0gbnVsbCAmJiBmYXIgIT09IEluZmluaXR5KSB7XG4gICAgbmYgPSAxIC8gKG5lYXIgLSBmYXIpO1xuICAgIG91dFsxMF0gPSAoZmFyICsgbmVhcikgKiBuZjtcbiAgICBvdXRbMTRdID0gMiAqIGZhciAqIG5lYXIgKiBuZjtcbiAgfSBlbHNlIHtcbiAgICBvdXRbMTBdID0gLTE7XG4gICAgb3V0WzE0XSA9IC0yICogbmVhcjtcbiAgfVxuXG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogR2VuZXJhdGVzIGEgcGVyc3BlY3RpdmUgcHJvamVjdGlvbiBtYXRyaXggd2l0aCB0aGUgZ2l2ZW4gZmllbGQgb2Ygdmlldy5cclxuICogVGhpcyBpcyBwcmltYXJpbHkgdXNlZnVsIGZvciBnZW5lcmF0aW5nIHByb2plY3Rpb24gbWF0cmljZXMgdG8gYmUgdXNlZFxyXG4gKiB3aXRoIHRoZSBzdGlsbCBleHBlcmllbWVudGFsIFdlYlZSIEFQSS5cclxuICpcclxuICogQHBhcmFtIHttYXQ0fSBvdXQgbWF0NCBmcnVzdHVtIG1hdHJpeCB3aWxsIGJlIHdyaXR0ZW4gaW50b1xyXG4gKiBAcGFyYW0ge09iamVjdH0gZm92IE9iamVjdCBjb250YWluaW5nIHRoZSBmb2xsb3dpbmcgdmFsdWVzOiB1cERlZ3JlZXMsIGRvd25EZWdyZWVzLCBsZWZ0RGVncmVlcywgcmlnaHREZWdyZWVzXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBuZWFyIE5lYXIgYm91bmQgb2YgdGhlIGZydXN0dW1cclxuICogQHBhcmFtIHtudW1iZXJ9IGZhciBGYXIgYm91bmQgb2YgdGhlIGZydXN0dW1cclxuICogQHJldHVybnMge21hdDR9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBwZXJzcGVjdGl2ZUZyb21GaWVsZE9mVmlldyhvdXQsIGZvdiwgbmVhciwgZmFyKSB7XG4gIHZhciB1cFRhbiA9IE1hdGgudGFuKGZvdi51cERlZ3JlZXMgKiBNYXRoLlBJIC8gMTgwLjApO1xuICB2YXIgZG93blRhbiA9IE1hdGgudGFuKGZvdi5kb3duRGVncmVlcyAqIE1hdGguUEkgLyAxODAuMCk7XG4gIHZhciBsZWZ0VGFuID0gTWF0aC50YW4oZm92LmxlZnREZWdyZWVzICogTWF0aC5QSSAvIDE4MC4wKTtcbiAgdmFyIHJpZ2h0VGFuID0gTWF0aC50YW4oZm92LnJpZ2h0RGVncmVlcyAqIE1hdGguUEkgLyAxODAuMCk7XG4gIHZhciB4U2NhbGUgPSAyLjAgLyAobGVmdFRhbiArIHJpZ2h0VGFuKTtcbiAgdmFyIHlTY2FsZSA9IDIuMCAvICh1cFRhbiArIGRvd25UYW4pO1xuICBvdXRbMF0gPSB4U2NhbGU7XG4gIG91dFsxXSA9IDAuMDtcbiAgb3V0WzJdID0gMC4wO1xuICBvdXRbM10gPSAwLjA7XG4gIG91dFs0XSA9IDAuMDtcbiAgb3V0WzVdID0geVNjYWxlO1xuICBvdXRbNl0gPSAwLjA7XG4gIG91dFs3XSA9IDAuMDtcbiAgb3V0WzhdID0gLSgobGVmdFRhbiAtIHJpZ2h0VGFuKSAqIHhTY2FsZSAqIDAuNSk7XG4gIG91dFs5XSA9ICh1cFRhbiAtIGRvd25UYW4pICogeVNjYWxlICogMC41O1xuICBvdXRbMTBdID0gZmFyIC8gKG5lYXIgLSBmYXIpO1xuICBvdXRbMTFdID0gLTEuMDtcbiAgb3V0WzEyXSA9IDAuMDtcbiAgb3V0WzEzXSA9IDAuMDtcbiAgb3V0WzE0XSA9IGZhciAqIG5lYXIgLyAobmVhciAtIGZhcik7XG4gIG91dFsxNV0gPSAwLjA7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogR2VuZXJhdGVzIGEgb3J0aG9nb25hbCBwcm9qZWN0aW9uIG1hdHJpeCB3aXRoIHRoZSBnaXZlbiBib3VuZHNcclxuICpcclxuICogQHBhcmFtIHttYXQ0fSBvdXQgbWF0NCBmcnVzdHVtIG1hdHJpeCB3aWxsIGJlIHdyaXR0ZW4gaW50b1xyXG4gKiBAcGFyYW0ge251bWJlcn0gbGVmdCBMZWZ0IGJvdW5kIG9mIHRoZSBmcnVzdHVtXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSByaWdodCBSaWdodCBib3VuZCBvZiB0aGUgZnJ1c3R1bVxyXG4gKiBAcGFyYW0ge251bWJlcn0gYm90dG9tIEJvdHRvbSBib3VuZCBvZiB0aGUgZnJ1c3R1bVxyXG4gKiBAcGFyYW0ge251bWJlcn0gdG9wIFRvcCBib3VuZCBvZiB0aGUgZnJ1c3R1bVxyXG4gKiBAcGFyYW0ge251bWJlcn0gbmVhciBOZWFyIGJvdW5kIG9mIHRoZSBmcnVzdHVtXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBmYXIgRmFyIGJvdW5kIG9mIHRoZSBmcnVzdHVtXHJcbiAqIEByZXR1cm5zIHttYXQ0fSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gb3J0aG8ob3V0LCBsZWZ0LCByaWdodCwgYm90dG9tLCB0b3AsIG5lYXIsIGZhcikge1xuICB2YXIgbHIgPSAxIC8gKGxlZnQgLSByaWdodCk7XG4gIHZhciBidCA9IDEgLyAoYm90dG9tIC0gdG9wKTtcbiAgdmFyIG5mID0gMSAvIChuZWFyIC0gZmFyKTtcbiAgb3V0WzBdID0gLTIgKiBscjtcbiAgb3V0WzFdID0gMDtcbiAgb3V0WzJdID0gMDtcbiAgb3V0WzNdID0gMDtcbiAgb3V0WzRdID0gMDtcbiAgb3V0WzVdID0gLTIgKiBidDtcbiAgb3V0WzZdID0gMDtcbiAgb3V0WzddID0gMDtcbiAgb3V0WzhdID0gMDtcbiAgb3V0WzldID0gMDtcbiAgb3V0WzEwXSA9IDIgKiBuZjtcbiAgb3V0WzExXSA9IDA7XG4gIG91dFsxMl0gPSAobGVmdCArIHJpZ2h0KSAqIGxyO1xuICBvdXRbMTNdID0gKHRvcCArIGJvdHRvbSkgKiBidDtcbiAgb3V0WzE0XSA9IChmYXIgKyBuZWFyKSAqIG5mO1xuICBvdXRbMTVdID0gMTtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBHZW5lcmF0ZXMgYSBsb29rLWF0IG1hdHJpeCB3aXRoIHRoZSBnaXZlbiBleWUgcG9zaXRpb24sIGZvY2FsIHBvaW50LCBhbmQgdXAgYXhpcy5cclxuICogSWYgeW91IHdhbnQgYSBtYXRyaXggdGhhdCBhY3R1YWxseSBtYWtlcyBhbiBvYmplY3QgbG9vayBhdCBhbm90aGVyIG9iamVjdCwgeW91IHNob3VsZCB1c2UgdGFyZ2V0VG8gaW5zdGVhZC5cclxuICpcclxuICogQHBhcmFtIHttYXQ0fSBvdXQgbWF0NCBmcnVzdHVtIG1hdHJpeCB3aWxsIGJlIHdyaXR0ZW4gaW50b1xyXG4gKiBAcGFyYW0ge3ZlYzN9IGV5ZSBQb3NpdGlvbiBvZiB0aGUgdmlld2VyXHJcbiAqIEBwYXJhbSB7dmVjM30gY2VudGVyIFBvaW50IHRoZSB2aWV3ZXIgaXMgbG9va2luZyBhdFxyXG4gKiBAcGFyYW0ge3ZlYzN9IHVwIHZlYzMgcG9pbnRpbmcgdXBcclxuICogQHJldHVybnMge21hdDR9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBsb29rQXQob3V0LCBleWUsIGNlbnRlciwgdXApIHtcbiAgdmFyIHgwLCB4MSwgeDIsIHkwLCB5MSwgeTIsIHowLCB6MSwgejIsIGxlbjtcbiAgdmFyIGV5ZXggPSBleWVbMF07XG4gIHZhciBleWV5ID0gZXllWzFdO1xuICB2YXIgZXlleiA9IGV5ZVsyXTtcbiAgdmFyIHVweCA9IHVwWzBdO1xuICB2YXIgdXB5ID0gdXBbMV07XG4gIHZhciB1cHogPSB1cFsyXTtcbiAgdmFyIGNlbnRlcnggPSBjZW50ZXJbMF07XG4gIHZhciBjZW50ZXJ5ID0gY2VudGVyWzFdO1xuICB2YXIgY2VudGVyeiA9IGNlbnRlclsyXTtcblxuICBpZiAoTWF0aC5hYnMoZXlleCAtIGNlbnRlcngpIDwgZ2xNYXRyaXguRVBTSUxPTiAmJiBNYXRoLmFicyhleWV5IC0gY2VudGVyeSkgPCBnbE1hdHJpeC5FUFNJTE9OICYmIE1hdGguYWJzKGV5ZXogLSBjZW50ZXJ6KSA8IGdsTWF0cml4LkVQU0lMT04pIHtcbiAgICByZXR1cm4gaWRlbnRpdHkob3V0KTtcbiAgfVxuXG4gIHowID0gZXlleCAtIGNlbnRlcng7XG4gIHoxID0gZXlleSAtIGNlbnRlcnk7XG4gIHoyID0gZXlleiAtIGNlbnRlcno7XG4gIGxlbiA9IDEgLyBNYXRoLmh5cG90KHowLCB6MSwgejIpO1xuICB6MCAqPSBsZW47XG4gIHoxICo9IGxlbjtcbiAgejIgKj0gbGVuO1xuICB4MCA9IHVweSAqIHoyIC0gdXB6ICogejE7XG4gIHgxID0gdXB6ICogejAgLSB1cHggKiB6MjtcbiAgeDIgPSB1cHggKiB6MSAtIHVweSAqIHowO1xuICBsZW4gPSBNYXRoLmh5cG90KHgwLCB4MSwgeDIpO1xuXG4gIGlmICghbGVuKSB7XG4gICAgeDAgPSAwO1xuICAgIHgxID0gMDtcbiAgICB4MiA9IDA7XG4gIH0gZWxzZSB7XG4gICAgbGVuID0gMSAvIGxlbjtcbiAgICB4MCAqPSBsZW47XG4gICAgeDEgKj0gbGVuO1xuICAgIHgyICo9IGxlbjtcbiAgfVxuXG4gIHkwID0gejEgKiB4MiAtIHoyICogeDE7XG4gIHkxID0gejIgKiB4MCAtIHowICogeDI7XG4gIHkyID0gejAgKiB4MSAtIHoxICogeDA7XG4gIGxlbiA9IE1hdGguaHlwb3QoeTAsIHkxLCB5Mik7XG5cbiAgaWYgKCFsZW4pIHtcbiAgICB5MCA9IDA7XG4gICAgeTEgPSAwO1xuICAgIHkyID0gMDtcbiAgfSBlbHNlIHtcbiAgICBsZW4gPSAxIC8gbGVuO1xuICAgIHkwICo9IGxlbjtcbiAgICB5MSAqPSBsZW47XG4gICAgeTIgKj0gbGVuO1xuICB9XG5cbiAgb3V0WzBdID0geDA7XG4gIG91dFsxXSA9IHkwO1xuICBvdXRbMl0gPSB6MDtcbiAgb3V0WzNdID0gMDtcbiAgb3V0WzRdID0geDE7XG4gIG91dFs1XSA9IHkxO1xuICBvdXRbNl0gPSB6MTtcbiAgb3V0WzddID0gMDtcbiAgb3V0WzhdID0geDI7XG4gIG91dFs5XSA9IHkyO1xuICBvdXRbMTBdID0gejI7XG4gIG91dFsxMV0gPSAwO1xuICBvdXRbMTJdID0gLSh4MCAqIGV5ZXggKyB4MSAqIGV5ZXkgKyB4MiAqIGV5ZXopO1xuICBvdXRbMTNdID0gLSh5MCAqIGV5ZXggKyB5MSAqIGV5ZXkgKyB5MiAqIGV5ZXopO1xuICBvdXRbMTRdID0gLSh6MCAqIGV5ZXggKyB6MSAqIGV5ZXkgKyB6MiAqIGV5ZXopO1xuICBvdXRbMTVdID0gMTtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBHZW5lcmF0ZXMgYSBtYXRyaXggdGhhdCBtYWtlcyBzb21ldGhpbmcgbG9vayBhdCBzb21ldGhpbmcgZWxzZS5cclxuICpcclxuICogQHBhcmFtIHttYXQ0fSBvdXQgbWF0NCBmcnVzdHVtIG1hdHJpeCB3aWxsIGJlIHdyaXR0ZW4gaW50b1xyXG4gKiBAcGFyYW0ge3ZlYzN9IGV5ZSBQb3NpdGlvbiBvZiB0aGUgdmlld2VyXHJcbiAqIEBwYXJhbSB7dmVjM30gY2VudGVyIFBvaW50IHRoZSB2aWV3ZXIgaXMgbG9va2luZyBhdFxyXG4gKiBAcGFyYW0ge3ZlYzN9IHVwIHZlYzMgcG9pbnRpbmcgdXBcclxuICogQHJldHVybnMge21hdDR9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiB0YXJnZXRUbyhvdXQsIGV5ZSwgdGFyZ2V0LCB1cCkge1xuICB2YXIgZXlleCA9IGV5ZVswXSxcbiAgICAgIGV5ZXkgPSBleWVbMV0sXG4gICAgICBleWV6ID0gZXllWzJdLFxuICAgICAgdXB4ID0gdXBbMF0sXG4gICAgICB1cHkgPSB1cFsxXSxcbiAgICAgIHVweiA9IHVwWzJdO1xuICB2YXIgejAgPSBleWV4IC0gdGFyZ2V0WzBdLFxuICAgICAgejEgPSBleWV5IC0gdGFyZ2V0WzFdLFxuICAgICAgejIgPSBleWV6IC0gdGFyZ2V0WzJdO1xuICB2YXIgbGVuID0gejAgKiB6MCArIHoxICogejEgKyB6MiAqIHoyO1xuXG4gIGlmIChsZW4gPiAwKSB7XG4gICAgbGVuID0gMSAvIE1hdGguc3FydChsZW4pO1xuICAgIHowICo9IGxlbjtcbiAgICB6MSAqPSBsZW47XG4gICAgejIgKj0gbGVuO1xuICB9XG5cbiAgdmFyIHgwID0gdXB5ICogejIgLSB1cHogKiB6MSxcbiAgICAgIHgxID0gdXB6ICogejAgLSB1cHggKiB6MixcbiAgICAgIHgyID0gdXB4ICogejEgLSB1cHkgKiB6MDtcbiAgbGVuID0geDAgKiB4MCArIHgxICogeDEgKyB4MiAqIHgyO1xuXG4gIGlmIChsZW4gPiAwKSB7XG4gICAgbGVuID0gMSAvIE1hdGguc3FydChsZW4pO1xuICAgIHgwICo9IGxlbjtcbiAgICB4MSAqPSBsZW47XG4gICAgeDIgKj0gbGVuO1xuICB9XG5cbiAgb3V0WzBdID0geDA7XG4gIG91dFsxXSA9IHgxO1xuICBvdXRbMl0gPSB4MjtcbiAgb3V0WzNdID0gMDtcbiAgb3V0WzRdID0gejEgKiB4MiAtIHoyICogeDE7XG4gIG91dFs1XSA9IHoyICogeDAgLSB6MCAqIHgyO1xuICBvdXRbNl0gPSB6MCAqIHgxIC0gejEgKiB4MDtcbiAgb3V0WzddID0gMDtcbiAgb3V0WzhdID0gejA7XG4gIG91dFs5XSA9IHoxO1xuICBvdXRbMTBdID0gejI7XG4gIG91dFsxMV0gPSAwO1xuICBvdXRbMTJdID0gZXlleDtcbiAgb3V0WzEzXSA9IGV5ZXk7XG4gIG91dFsxNF0gPSBleWV6O1xuICBvdXRbMTVdID0gMTtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBSZXR1cm5zIGEgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIGEgbWF0NFxyXG4gKlxyXG4gKiBAcGFyYW0ge21hdDR9IGEgbWF0cml4IHRvIHJlcHJlc2VudCBhcyBhIHN0cmluZ1xyXG4gKiBAcmV0dXJucyB7U3RyaW5nfSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgdGhlIG1hdHJpeFxyXG4gKi9cblxuXG5mdW5jdGlvbiBzdHIoYSkge1xuICByZXR1cm4gXCJtYXQ0KFwiICsgYVswXSArIFwiLCBcIiArIGFbMV0gKyBcIiwgXCIgKyBhWzJdICsgXCIsIFwiICsgYVszXSArIFwiLCBcIiArIGFbNF0gKyBcIiwgXCIgKyBhWzVdICsgXCIsIFwiICsgYVs2XSArIFwiLCBcIiArIGFbN10gKyBcIiwgXCIgKyBhWzhdICsgXCIsIFwiICsgYVs5XSArIFwiLCBcIiArIGFbMTBdICsgXCIsIFwiICsgYVsxMV0gKyBcIiwgXCIgKyBhWzEyXSArIFwiLCBcIiArIGFbMTNdICsgXCIsIFwiICsgYVsxNF0gKyBcIiwgXCIgKyBhWzE1XSArIFwiKVwiO1xufVxuLyoqXHJcbiAqIFJldHVybnMgRnJvYmVuaXVzIG5vcm0gb2YgYSBtYXQ0XHJcbiAqXHJcbiAqIEBwYXJhbSB7bWF0NH0gYSB0aGUgbWF0cml4IHRvIGNhbGN1bGF0ZSBGcm9iZW5pdXMgbm9ybSBvZlxyXG4gKiBAcmV0dXJucyB7TnVtYmVyfSBGcm9iZW5pdXMgbm9ybVxyXG4gKi9cblxuXG5mdW5jdGlvbiBmcm9iKGEpIHtcbiAgcmV0dXJuIE1hdGguaHlwb3QoYVswXSwgYVsxXSwgYVsyXSwgYVszXSwgYVs0XSwgYVs1XSwgYVs2XSwgYVs3XSwgYVs4XSwgYVs5XSwgYVsxMF0sIGFbMTFdLCBhWzEyXSwgYVsxM10sIGFbMTRdLCBhWzE1XSk7XG59XG4vKipcclxuICogQWRkcyB0d28gbWF0NCdzXHJcbiAqXHJcbiAqIEBwYXJhbSB7bWF0NH0gb3V0IHRoZSByZWNlaXZpbmcgbWF0cml4XHJcbiAqIEBwYXJhbSB7bWF0NH0gYSB0aGUgZmlyc3Qgb3BlcmFuZFxyXG4gKiBAcGFyYW0ge21hdDR9IGIgdGhlIHNlY29uZCBvcGVyYW5kXHJcbiAqIEByZXR1cm5zIHttYXQ0fSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gYWRkKG91dCwgYSwgYikge1xuICBvdXRbMF0gPSBhWzBdICsgYlswXTtcbiAgb3V0WzFdID0gYVsxXSArIGJbMV07XG4gIG91dFsyXSA9IGFbMl0gKyBiWzJdO1xuICBvdXRbM10gPSBhWzNdICsgYlszXTtcbiAgb3V0WzRdID0gYVs0XSArIGJbNF07XG4gIG91dFs1XSA9IGFbNV0gKyBiWzVdO1xuICBvdXRbNl0gPSBhWzZdICsgYls2XTtcbiAgb3V0WzddID0gYVs3XSArIGJbN107XG4gIG91dFs4XSA9IGFbOF0gKyBiWzhdO1xuICBvdXRbOV0gPSBhWzldICsgYls5XTtcbiAgb3V0WzEwXSA9IGFbMTBdICsgYlsxMF07XG4gIG91dFsxMV0gPSBhWzExXSArIGJbMTFdO1xuICBvdXRbMTJdID0gYVsxMl0gKyBiWzEyXTtcbiAgb3V0WzEzXSA9IGFbMTNdICsgYlsxM107XG4gIG91dFsxNF0gPSBhWzE0XSArIGJbMTRdO1xuICBvdXRbMTVdID0gYVsxNV0gKyBiWzE1XTtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBTdWJ0cmFjdHMgbWF0cml4IGIgZnJvbSBtYXRyaXggYVxyXG4gKlxyXG4gKiBAcGFyYW0ge21hdDR9IG91dCB0aGUgcmVjZWl2aW5nIG1hdHJpeFxyXG4gKiBAcGFyYW0ge21hdDR9IGEgdGhlIGZpcnN0IG9wZXJhbmRcclxuICogQHBhcmFtIHttYXQ0fSBiIHRoZSBzZWNvbmQgb3BlcmFuZFxyXG4gKiBAcmV0dXJucyB7bWF0NH0gb3V0XHJcbiAqL1xuXG5cbmZ1bmN0aW9uIHN1YnRyYWN0KG91dCwgYSwgYikge1xuICBvdXRbMF0gPSBhWzBdIC0gYlswXTtcbiAgb3V0WzFdID0gYVsxXSAtIGJbMV07XG4gIG91dFsyXSA9IGFbMl0gLSBiWzJdO1xuICBvdXRbM10gPSBhWzNdIC0gYlszXTtcbiAgb3V0WzRdID0gYVs0XSAtIGJbNF07XG4gIG91dFs1XSA9IGFbNV0gLSBiWzVdO1xuICBvdXRbNl0gPSBhWzZdIC0gYls2XTtcbiAgb3V0WzddID0gYVs3XSAtIGJbN107XG4gIG91dFs4XSA9IGFbOF0gLSBiWzhdO1xuICBvdXRbOV0gPSBhWzldIC0gYls5XTtcbiAgb3V0WzEwXSA9IGFbMTBdIC0gYlsxMF07XG4gIG91dFsxMV0gPSBhWzExXSAtIGJbMTFdO1xuICBvdXRbMTJdID0gYVsxMl0gLSBiWzEyXTtcbiAgb3V0WzEzXSA9IGFbMTNdIC0gYlsxM107XG4gIG91dFsxNF0gPSBhWzE0XSAtIGJbMTRdO1xuICBvdXRbMTVdID0gYVsxNV0gLSBiWzE1XTtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBNdWx0aXBseSBlYWNoIGVsZW1lbnQgb2YgdGhlIG1hdHJpeCBieSBhIHNjYWxhci5cclxuICpcclxuICogQHBhcmFtIHttYXQ0fSBvdXQgdGhlIHJlY2VpdmluZyBtYXRyaXhcclxuICogQHBhcmFtIHttYXQ0fSBhIHRoZSBtYXRyaXggdG8gc2NhbGVcclxuICogQHBhcmFtIHtOdW1iZXJ9IGIgYW1vdW50IHRvIHNjYWxlIHRoZSBtYXRyaXgncyBlbGVtZW50cyBieVxyXG4gKiBAcmV0dXJucyB7bWF0NH0gb3V0XHJcbiAqL1xuXG5cbmZ1bmN0aW9uIG11bHRpcGx5U2NhbGFyKG91dCwgYSwgYikge1xuICBvdXRbMF0gPSBhWzBdICogYjtcbiAgb3V0WzFdID0gYVsxXSAqIGI7XG4gIG91dFsyXSA9IGFbMl0gKiBiO1xuICBvdXRbM10gPSBhWzNdICogYjtcbiAgb3V0WzRdID0gYVs0XSAqIGI7XG4gIG91dFs1XSA9IGFbNV0gKiBiO1xuICBvdXRbNl0gPSBhWzZdICogYjtcbiAgb3V0WzddID0gYVs3XSAqIGI7XG4gIG91dFs4XSA9IGFbOF0gKiBiO1xuICBvdXRbOV0gPSBhWzldICogYjtcbiAgb3V0WzEwXSA9IGFbMTBdICogYjtcbiAgb3V0WzExXSA9IGFbMTFdICogYjtcbiAgb3V0WzEyXSA9IGFbMTJdICogYjtcbiAgb3V0WzEzXSA9IGFbMTNdICogYjtcbiAgb3V0WzE0XSA9IGFbMTRdICogYjtcbiAgb3V0WzE1XSA9IGFbMTVdICogYjtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBBZGRzIHR3byBtYXQ0J3MgYWZ0ZXIgbXVsdGlwbHlpbmcgZWFjaCBlbGVtZW50IG9mIHRoZSBzZWNvbmQgb3BlcmFuZCBieSBhIHNjYWxhciB2YWx1ZS5cclxuICpcclxuICogQHBhcmFtIHttYXQ0fSBvdXQgdGhlIHJlY2VpdmluZyB2ZWN0b3JcclxuICogQHBhcmFtIHttYXQ0fSBhIHRoZSBmaXJzdCBvcGVyYW5kXHJcbiAqIEBwYXJhbSB7bWF0NH0gYiB0aGUgc2Vjb25kIG9wZXJhbmRcclxuICogQHBhcmFtIHtOdW1iZXJ9IHNjYWxlIHRoZSBhbW91bnQgdG8gc2NhbGUgYidzIGVsZW1lbnRzIGJ5IGJlZm9yZSBhZGRpbmdcclxuICogQHJldHVybnMge21hdDR9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBtdWx0aXBseVNjYWxhckFuZEFkZChvdXQsIGEsIGIsIHNjYWxlKSB7XG4gIG91dFswXSA9IGFbMF0gKyBiWzBdICogc2NhbGU7XG4gIG91dFsxXSA9IGFbMV0gKyBiWzFdICogc2NhbGU7XG4gIG91dFsyXSA9IGFbMl0gKyBiWzJdICogc2NhbGU7XG4gIG91dFszXSA9IGFbM10gKyBiWzNdICogc2NhbGU7XG4gIG91dFs0XSA9IGFbNF0gKyBiWzRdICogc2NhbGU7XG4gIG91dFs1XSA9IGFbNV0gKyBiWzVdICogc2NhbGU7XG4gIG91dFs2XSA9IGFbNl0gKyBiWzZdICogc2NhbGU7XG4gIG91dFs3XSA9IGFbN10gKyBiWzddICogc2NhbGU7XG4gIG91dFs4XSA9IGFbOF0gKyBiWzhdICogc2NhbGU7XG4gIG91dFs5XSA9IGFbOV0gKyBiWzldICogc2NhbGU7XG4gIG91dFsxMF0gPSBhWzEwXSArIGJbMTBdICogc2NhbGU7XG4gIG91dFsxMV0gPSBhWzExXSArIGJbMTFdICogc2NhbGU7XG4gIG91dFsxMl0gPSBhWzEyXSArIGJbMTJdICogc2NhbGU7XG4gIG91dFsxM10gPSBhWzEzXSArIGJbMTNdICogc2NhbGU7XG4gIG91dFsxNF0gPSBhWzE0XSArIGJbMTRdICogc2NhbGU7XG4gIG91dFsxNV0gPSBhWzE1XSArIGJbMTVdICogc2NhbGU7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogUmV0dXJucyB3aGV0aGVyIG9yIG5vdCB0aGUgbWF0cmljZXMgaGF2ZSBleGFjdGx5IHRoZSBzYW1lIGVsZW1lbnRzIGluIHRoZSBzYW1lIHBvc2l0aW9uICh3aGVuIGNvbXBhcmVkIHdpdGggPT09KVxyXG4gKlxyXG4gKiBAcGFyYW0ge21hdDR9IGEgVGhlIGZpcnN0IG1hdHJpeC5cclxuICogQHBhcmFtIHttYXQ0fSBiIFRoZSBzZWNvbmQgbWF0cml4LlxyXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgbWF0cmljZXMgYXJlIGVxdWFsLCBmYWxzZSBvdGhlcndpc2UuXHJcbiAqL1xuXG5cbmZ1bmN0aW9uIGV4YWN0RXF1YWxzKGEsIGIpIHtcbiAgcmV0dXJuIGFbMF0gPT09IGJbMF0gJiYgYVsxXSA9PT0gYlsxXSAmJiBhWzJdID09PSBiWzJdICYmIGFbM10gPT09IGJbM10gJiYgYVs0XSA9PT0gYls0XSAmJiBhWzVdID09PSBiWzVdICYmIGFbNl0gPT09IGJbNl0gJiYgYVs3XSA9PT0gYls3XSAmJiBhWzhdID09PSBiWzhdICYmIGFbOV0gPT09IGJbOV0gJiYgYVsxMF0gPT09IGJbMTBdICYmIGFbMTFdID09PSBiWzExXSAmJiBhWzEyXSA9PT0gYlsxMl0gJiYgYVsxM10gPT09IGJbMTNdICYmIGFbMTRdID09PSBiWzE0XSAmJiBhWzE1XSA9PT0gYlsxNV07XG59XG4vKipcclxuICogUmV0dXJucyB3aGV0aGVyIG9yIG5vdCB0aGUgbWF0cmljZXMgaGF2ZSBhcHByb3hpbWF0ZWx5IHRoZSBzYW1lIGVsZW1lbnRzIGluIHRoZSBzYW1lIHBvc2l0aW9uLlxyXG4gKlxyXG4gKiBAcGFyYW0ge21hdDR9IGEgVGhlIGZpcnN0IG1hdHJpeC5cclxuICogQHBhcmFtIHttYXQ0fSBiIFRoZSBzZWNvbmQgbWF0cml4LlxyXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgbWF0cmljZXMgYXJlIGVxdWFsLCBmYWxzZSBvdGhlcndpc2UuXHJcbiAqL1xuXG5cbmZ1bmN0aW9uIGVxdWFscyhhLCBiKSB7XG4gIHZhciBhMCA9IGFbMF0sXG4gICAgICBhMSA9IGFbMV0sXG4gICAgICBhMiA9IGFbMl0sXG4gICAgICBhMyA9IGFbM107XG4gIHZhciBhNCA9IGFbNF0sXG4gICAgICBhNSA9IGFbNV0sXG4gICAgICBhNiA9IGFbNl0sXG4gICAgICBhNyA9IGFbN107XG4gIHZhciBhOCA9IGFbOF0sXG4gICAgICBhOSA9IGFbOV0sXG4gICAgICBhMTAgPSBhWzEwXSxcbiAgICAgIGExMSA9IGFbMTFdO1xuICB2YXIgYTEyID0gYVsxMl0sXG4gICAgICBhMTMgPSBhWzEzXSxcbiAgICAgIGExNCA9IGFbMTRdLFxuICAgICAgYTE1ID0gYVsxNV07XG4gIHZhciBiMCA9IGJbMF0sXG4gICAgICBiMSA9IGJbMV0sXG4gICAgICBiMiA9IGJbMl0sXG4gICAgICBiMyA9IGJbM107XG4gIHZhciBiNCA9IGJbNF0sXG4gICAgICBiNSA9IGJbNV0sXG4gICAgICBiNiA9IGJbNl0sXG4gICAgICBiNyA9IGJbN107XG4gIHZhciBiOCA9IGJbOF0sXG4gICAgICBiOSA9IGJbOV0sXG4gICAgICBiMTAgPSBiWzEwXSxcbiAgICAgIGIxMSA9IGJbMTFdO1xuICB2YXIgYjEyID0gYlsxMl0sXG4gICAgICBiMTMgPSBiWzEzXSxcbiAgICAgIGIxNCA9IGJbMTRdLFxuICAgICAgYjE1ID0gYlsxNV07XG4gIHJldHVybiBNYXRoLmFicyhhMCAtIGIwKSA8PSBnbE1hdHJpeC5FUFNJTE9OICogTWF0aC5tYXgoMS4wLCBNYXRoLmFicyhhMCksIE1hdGguYWJzKGIwKSkgJiYgTWF0aC5hYnMoYTEgLSBiMSkgPD0gZ2xNYXRyaXguRVBTSUxPTiAqIE1hdGgubWF4KDEuMCwgTWF0aC5hYnMoYTEpLCBNYXRoLmFicyhiMSkpICYmIE1hdGguYWJzKGEyIC0gYjIpIDw9IGdsTWF0cml4LkVQU0lMT04gKiBNYXRoLm1heCgxLjAsIE1hdGguYWJzKGEyKSwgTWF0aC5hYnMoYjIpKSAmJiBNYXRoLmFicyhhMyAtIGIzKSA8PSBnbE1hdHJpeC5FUFNJTE9OICogTWF0aC5tYXgoMS4wLCBNYXRoLmFicyhhMyksIE1hdGguYWJzKGIzKSkgJiYgTWF0aC5hYnMoYTQgLSBiNCkgPD0gZ2xNYXRyaXguRVBTSUxPTiAqIE1hdGgubWF4KDEuMCwgTWF0aC5hYnMoYTQpLCBNYXRoLmFicyhiNCkpICYmIE1hdGguYWJzKGE1IC0gYjUpIDw9IGdsTWF0cml4LkVQU0lMT04gKiBNYXRoLm1heCgxLjAsIE1hdGguYWJzKGE1KSwgTWF0aC5hYnMoYjUpKSAmJiBNYXRoLmFicyhhNiAtIGI2KSA8PSBnbE1hdHJpeC5FUFNJTE9OICogTWF0aC5tYXgoMS4wLCBNYXRoLmFicyhhNiksIE1hdGguYWJzKGI2KSkgJiYgTWF0aC5hYnMoYTcgLSBiNykgPD0gZ2xNYXRyaXguRVBTSUxPTiAqIE1hdGgubWF4KDEuMCwgTWF0aC5hYnMoYTcpLCBNYXRoLmFicyhiNykpICYmIE1hdGguYWJzKGE4IC0gYjgpIDw9IGdsTWF0cml4LkVQU0lMT04gKiBNYXRoLm1heCgxLjAsIE1hdGguYWJzKGE4KSwgTWF0aC5hYnMoYjgpKSAmJiBNYXRoLmFicyhhOSAtIGI5KSA8PSBnbE1hdHJpeC5FUFNJTE9OICogTWF0aC5tYXgoMS4wLCBNYXRoLmFicyhhOSksIE1hdGguYWJzKGI5KSkgJiYgTWF0aC5hYnMoYTEwIC0gYjEwKSA8PSBnbE1hdHJpeC5FUFNJTE9OICogTWF0aC5tYXgoMS4wLCBNYXRoLmFicyhhMTApLCBNYXRoLmFicyhiMTApKSAmJiBNYXRoLmFicyhhMTEgLSBiMTEpIDw9IGdsTWF0cml4LkVQU0lMT04gKiBNYXRoLm1heCgxLjAsIE1hdGguYWJzKGExMSksIE1hdGguYWJzKGIxMSkpICYmIE1hdGguYWJzKGExMiAtIGIxMikgPD0gZ2xNYXRyaXguRVBTSUxPTiAqIE1hdGgubWF4KDEuMCwgTWF0aC5hYnMoYTEyKSwgTWF0aC5hYnMoYjEyKSkgJiYgTWF0aC5hYnMoYTEzIC0gYjEzKSA8PSBnbE1hdHJpeC5FUFNJTE9OICogTWF0aC5tYXgoMS4wLCBNYXRoLmFicyhhMTMpLCBNYXRoLmFicyhiMTMpKSAmJiBNYXRoLmFicyhhMTQgLSBiMTQpIDw9IGdsTWF0cml4LkVQU0lMT04gKiBNYXRoLm1heCgxLjAsIE1hdGguYWJzKGExNCksIE1hdGguYWJzKGIxNCkpICYmIE1hdGguYWJzKGExNSAtIGIxNSkgPD0gZ2xNYXRyaXguRVBTSUxPTiAqIE1hdGgubWF4KDEuMCwgTWF0aC5hYnMoYTE1KSwgTWF0aC5hYnMoYjE1KSk7XG59XG4vKipcclxuICogQWxpYXMgZm9yIHtAbGluayBtYXQ0Lm11bHRpcGx5fVxyXG4gKiBAZnVuY3Rpb25cclxuICovXG5cblxudmFyIG11bCA9IG11bHRpcGx5O1xuLyoqXHJcbiAqIEFsaWFzIGZvciB7QGxpbmsgbWF0NC5zdWJ0cmFjdH1cclxuICogQGZ1bmN0aW9uXHJcbiAqL1xuXG5leHBvcnRzLm11bCA9IG11bDtcbnZhciBzdWIgPSBzdWJ0cmFjdDtcbmV4cG9ydHMuc3ViID0gc3ViOyIsIlwidXNlIHN0cmljdFwiO1xuXG5mdW5jdGlvbiBfdHlwZW9mKG9iaikgeyBcIkBiYWJlbC9oZWxwZXJzIC0gdHlwZW9mXCI7IGlmICh0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIFN5bWJvbC5pdGVyYXRvciA9PT0gXCJzeW1ib2xcIikgeyBfdHlwZW9mID0gZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgcmV0dXJuIHR5cGVvZiBvYmo7IH07IH0gZWxzZSB7IF90eXBlb2YgPSBmdW5jdGlvbiBfdHlwZW9mKG9iaikgeyByZXR1cm4gb2JqICYmIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvYmouY29uc3RydWN0b3IgPT09IFN5bWJvbCAmJiBvYmogIT09IFN5bWJvbC5wcm90b3R5cGUgPyBcInN5bWJvbFwiIDogdHlwZW9mIG9iajsgfTsgfSByZXR1cm4gX3R5cGVvZihvYmopOyB9XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmNyZWF0ZSA9IGNyZWF0ZTtcbmV4cG9ydHMuaWRlbnRpdHkgPSBpZGVudGl0eTtcbmV4cG9ydHMuc2V0QXhpc0FuZ2xlID0gc2V0QXhpc0FuZ2xlO1xuZXhwb3J0cy5nZXRBeGlzQW5nbGUgPSBnZXRBeGlzQW5nbGU7XG5leHBvcnRzLmdldEFuZ2xlID0gZ2V0QW5nbGU7XG5leHBvcnRzLm11bHRpcGx5ID0gbXVsdGlwbHk7XG5leHBvcnRzLnJvdGF0ZVggPSByb3RhdGVYO1xuZXhwb3J0cy5yb3RhdGVZID0gcm90YXRlWTtcbmV4cG9ydHMucm90YXRlWiA9IHJvdGF0ZVo7XG5leHBvcnRzLmNhbGN1bGF0ZVcgPSBjYWxjdWxhdGVXO1xuZXhwb3J0cy5leHAgPSBleHA7XG5leHBvcnRzLmxuID0gbG47XG5leHBvcnRzLnBvdyA9IHBvdztcbmV4cG9ydHMuc2xlcnAgPSBzbGVycDtcbmV4cG9ydHMucmFuZG9tID0gcmFuZG9tO1xuZXhwb3J0cy5pbnZlcnQgPSBpbnZlcnQ7XG5leHBvcnRzLmNvbmp1Z2F0ZSA9IGNvbmp1Z2F0ZTtcbmV4cG9ydHMuZnJvbU1hdDMgPSBmcm9tTWF0MztcbmV4cG9ydHMuZnJvbUV1bGVyID0gZnJvbUV1bGVyO1xuZXhwb3J0cy5zdHIgPSBzdHI7XG5leHBvcnRzLnNldEF4ZXMgPSBleHBvcnRzLnNxbGVycCA9IGV4cG9ydHMucm90YXRpb25UbyA9IGV4cG9ydHMuZXF1YWxzID0gZXhwb3J0cy5leGFjdEVxdWFscyA9IGV4cG9ydHMubm9ybWFsaXplID0gZXhwb3J0cy5zcXJMZW4gPSBleHBvcnRzLnNxdWFyZWRMZW5ndGggPSBleHBvcnRzLmxlbiA9IGV4cG9ydHMubGVuZ3RoID0gZXhwb3J0cy5sZXJwID0gZXhwb3J0cy5kb3QgPSBleHBvcnRzLnNjYWxlID0gZXhwb3J0cy5tdWwgPSBleHBvcnRzLmFkZCA9IGV4cG9ydHMuc2V0ID0gZXhwb3J0cy5jb3B5ID0gZXhwb3J0cy5mcm9tVmFsdWVzID0gZXhwb3J0cy5jbG9uZSA9IHZvaWQgMDtcblxudmFyIGdsTWF0cml4ID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQocmVxdWlyZShcIi4vY29tbW9uLmpzXCIpKTtcblxudmFyIG1hdDMgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChyZXF1aXJlKFwiLi9tYXQzLmpzXCIpKTtcblxudmFyIHZlYzMgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChyZXF1aXJlKFwiLi92ZWMzLmpzXCIpKTtcblxudmFyIHZlYzQgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChyZXF1aXJlKFwiLi92ZWM0LmpzXCIpKTtcblxuZnVuY3Rpb24gX2dldFJlcXVpcmVXaWxkY2FyZENhY2hlKCkgeyBpZiAodHlwZW9mIFdlYWtNYXAgIT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIG51bGw7IHZhciBjYWNoZSA9IG5ldyBXZWFrTWFwKCk7IF9nZXRSZXF1aXJlV2lsZGNhcmRDYWNoZSA9IGZ1bmN0aW9uIF9nZXRSZXF1aXJlV2lsZGNhcmRDYWNoZSgpIHsgcmV0dXJuIGNhY2hlOyB9OyByZXR1cm4gY2FjaGU7IH1cblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQob2JqKSB7IGlmIChvYmogJiYgb2JqLl9fZXNNb2R1bGUpIHsgcmV0dXJuIG9iajsgfSBpZiAob2JqID09PSBudWxsIHx8IF90eXBlb2Yob2JqKSAhPT0gXCJvYmplY3RcIiAmJiB0eXBlb2Ygb2JqICE9PSBcImZ1bmN0aW9uXCIpIHsgcmV0dXJuIHsgXCJkZWZhdWx0XCI6IG9iaiB9OyB9IHZhciBjYWNoZSA9IF9nZXRSZXF1aXJlV2lsZGNhcmRDYWNoZSgpOyBpZiAoY2FjaGUgJiYgY2FjaGUuaGFzKG9iaikpIHsgcmV0dXJuIGNhY2hlLmdldChvYmopOyB9IHZhciBuZXdPYmogPSB7fTsgdmFyIGhhc1Byb3BlcnR5RGVzY3JpcHRvciA9IE9iamVjdC5kZWZpbmVQcm9wZXJ0eSAmJiBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yOyBmb3IgKHZhciBrZXkgaW4gb2JqKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpKSB7IHZhciBkZXNjID0gaGFzUHJvcGVydHlEZXNjcmlwdG9yID8gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmosIGtleSkgOiBudWxsOyBpZiAoZGVzYyAmJiAoZGVzYy5nZXQgfHwgZGVzYy5zZXQpKSB7IE9iamVjdC5kZWZpbmVQcm9wZXJ0eShuZXdPYmosIGtleSwgZGVzYyk7IH0gZWxzZSB7IG5ld09ialtrZXldID0gb2JqW2tleV07IH0gfSB9IG5ld09ialtcImRlZmF1bHRcIl0gPSBvYmo7IGlmIChjYWNoZSkgeyBjYWNoZS5zZXQob2JqLCBuZXdPYmopOyB9IHJldHVybiBuZXdPYmo7IH1cblxuLyoqXHJcbiAqIFF1YXRlcm5pb25cclxuICogQG1vZHVsZSBxdWF0XHJcbiAqL1xuXG4vKipcclxuICogQ3JlYXRlcyBhIG5ldyBpZGVudGl0eSBxdWF0XHJcbiAqXHJcbiAqIEByZXR1cm5zIHtxdWF0fSBhIG5ldyBxdWF0ZXJuaW9uXHJcbiAqL1xuZnVuY3Rpb24gY3JlYXRlKCkge1xuICB2YXIgb3V0ID0gbmV3IGdsTWF0cml4LkFSUkFZX1RZUEUoNCk7XG5cbiAgaWYgKGdsTWF0cml4LkFSUkFZX1RZUEUgIT0gRmxvYXQzMkFycmF5KSB7XG4gICAgb3V0WzBdID0gMDtcbiAgICBvdXRbMV0gPSAwO1xuICAgIG91dFsyXSA9IDA7XG4gIH1cblxuICBvdXRbM10gPSAxO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIFNldCBhIHF1YXQgdG8gdGhlIGlkZW50aXR5IHF1YXRlcm5pb25cclxuICpcclxuICogQHBhcmFtIHtxdWF0fSBvdXQgdGhlIHJlY2VpdmluZyBxdWF0ZXJuaW9uXHJcbiAqIEByZXR1cm5zIHtxdWF0fSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gaWRlbnRpdHkob3V0KSB7XG4gIG91dFswXSA9IDA7XG4gIG91dFsxXSA9IDA7XG4gIG91dFsyXSA9IDA7XG4gIG91dFszXSA9IDE7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogU2V0cyBhIHF1YXQgZnJvbSB0aGUgZ2l2ZW4gYW5nbGUgYW5kIHJvdGF0aW9uIGF4aXMsXHJcbiAqIHRoZW4gcmV0dXJucyBpdC5cclxuICpcclxuICogQHBhcmFtIHtxdWF0fSBvdXQgdGhlIHJlY2VpdmluZyBxdWF0ZXJuaW9uXHJcbiAqIEBwYXJhbSB7dmVjM30gYXhpcyB0aGUgYXhpcyBhcm91bmQgd2hpY2ggdG8gcm90YXRlXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSByYWQgdGhlIGFuZ2xlIGluIHJhZGlhbnNcclxuICogQHJldHVybnMge3F1YXR9IG91dFxyXG4gKiovXG5cblxuZnVuY3Rpb24gc2V0QXhpc0FuZ2xlKG91dCwgYXhpcywgcmFkKSB7XG4gIHJhZCA9IHJhZCAqIDAuNTtcbiAgdmFyIHMgPSBNYXRoLnNpbihyYWQpO1xuICBvdXRbMF0gPSBzICogYXhpc1swXTtcbiAgb3V0WzFdID0gcyAqIGF4aXNbMV07XG4gIG91dFsyXSA9IHMgKiBheGlzWzJdO1xuICBvdXRbM10gPSBNYXRoLmNvcyhyYWQpO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIEdldHMgdGhlIHJvdGF0aW9uIGF4aXMgYW5kIGFuZ2xlIGZvciBhIGdpdmVuXHJcbiAqICBxdWF0ZXJuaW9uLiBJZiBhIHF1YXRlcm5pb24gaXMgY3JlYXRlZCB3aXRoXHJcbiAqICBzZXRBeGlzQW5nbGUsIHRoaXMgbWV0aG9kIHdpbGwgcmV0dXJuIHRoZSBzYW1lXHJcbiAqICB2YWx1ZXMgYXMgcHJvdmlkaWVkIGluIHRoZSBvcmlnaW5hbCBwYXJhbWV0ZXIgbGlzdFxyXG4gKiAgT1IgZnVuY3Rpb25hbGx5IGVxdWl2YWxlbnQgdmFsdWVzLlxyXG4gKiBFeGFtcGxlOiBUaGUgcXVhdGVybmlvbiBmb3JtZWQgYnkgYXhpcyBbMCwgMCwgMV0gYW5kXHJcbiAqICBhbmdsZSAtOTAgaXMgdGhlIHNhbWUgYXMgdGhlIHF1YXRlcm5pb24gZm9ybWVkIGJ5XHJcbiAqICBbMCwgMCwgMV0gYW5kIDI3MC4gVGhpcyBtZXRob2QgZmF2b3JzIHRoZSBsYXR0ZXIuXHJcbiAqIEBwYXJhbSAge3ZlYzN9IG91dF9heGlzICBWZWN0b3IgcmVjZWl2aW5nIHRoZSBheGlzIG9mIHJvdGF0aW9uXHJcbiAqIEBwYXJhbSAge3F1YXR9IHEgICAgIFF1YXRlcm5pb24gdG8gYmUgZGVjb21wb3NlZFxyXG4gKiBAcmV0dXJuIHtOdW1iZXJ9ICAgICBBbmdsZSwgaW4gcmFkaWFucywgb2YgdGhlIHJvdGF0aW9uXHJcbiAqL1xuXG5cbmZ1bmN0aW9uIGdldEF4aXNBbmdsZShvdXRfYXhpcywgcSkge1xuICB2YXIgcmFkID0gTWF0aC5hY29zKHFbM10pICogMi4wO1xuICB2YXIgcyA9IE1hdGguc2luKHJhZCAvIDIuMCk7XG5cbiAgaWYgKHMgPiBnbE1hdHJpeC5FUFNJTE9OKSB7XG4gICAgb3V0X2F4aXNbMF0gPSBxWzBdIC8gcztcbiAgICBvdXRfYXhpc1sxXSA9IHFbMV0gLyBzO1xuICAgIG91dF9heGlzWzJdID0gcVsyXSAvIHM7XG4gIH0gZWxzZSB7XG4gICAgLy8gSWYgcyBpcyB6ZXJvLCByZXR1cm4gYW55IGF4aXMgKG5vIHJvdGF0aW9uIC0gYXhpcyBkb2VzIG5vdCBtYXR0ZXIpXG4gICAgb3V0X2F4aXNbMF0gPSAxO1xuICAgIG91dF9heGlzWzFdID0gMDtcbiAgICBvdXRfYXhpc1syXSA9IDA7XG4gIH1cblxuICByZXR1cm4gcmFkO1xufVxuLyoqXHJcbiAqIEdldHMgdGhlIGFuZ3VsYXIgZGlzdGFuY2UgYmV0d2VlbiB0d28gdW5pdCBxdWF0ZXJuaW9uc1xyXG4gKlxyXG4gKiBAcGFyYW0gIHtxdWF0fSBhICAgICBPcmlnaW4gdW5pdCBxdWF0ZXJuaW9uXHJcbiAqIEBwYXJhbSAge3F1YXR9IGIgICAgIERlc3RpbmF0aW9uIHVuaXQgcXVhdGVybmlvblxyXG4gKiBAcmV0dXJuIHtOdW1iZXJ9ICAgICBBbmdsZSwgaW4gcmFkaWFucywgYmV0d2VlbiB0aGUgdHdvIHF1YXRlcm5pb25zXHJcbiAqL1xuXG5cbmZ1bmN0aW9uIGdldEFuZ2xlKGEsIGIpIHtcbiAgdmFyIGRvdHByb2R1Y3QgPSBkb3QoYSwgYik7XG4gIHJldHVybiBNYXRoLmFjb3MoMiAqIGRvdHByb2R1Y3QgKiBkb3Rwcm9kdWN0IC0gMSk7XG59XG4vKipcclxuICogTXVsdGlwbGllcyB0d28gcXVhdCdzXHJcbiAqXHJcbiAqIEBwYXJhbSB7cXVhdH0gb3V0IHRoZSByZWNlaXZpbmcgcXVhdGVybmlvblxyXG4gKiBAcGFyYW0ge3F1YXR9IGEgdGhlIGZpcnN0IG9wZXJhbmRcclxuICogQHBhcmFtIHtxdWF0fSBiIHRoZSBzZWNvbmQgb3BlcmFuZFxyXG4gKiBAcmV0dXJucyB7cXVhdH0gb3V0XHJcbiAqL1xuXG5cbmZ1bmN0aW9uIG11bHRpcGx5KG91dCwgYSwgYikge1xuICB2YXIgYXggPSBhWzBdLFxuICAgICAgYXkgPSBhWzFdLFxuICAgICAgYXogPSBhWzJdLFxuICAgICAgYXcgPSBhWzNdO1xuICB2YXIgYnggPSBiWzBdLFxuICAgICAgYnkgPSBiWzFdLFxuICAgICAgYnogPSBiWzJdLFxuICAgICAgYncgPSBiWzNdO1xuICBvdXRbMF0gPSBheCAqIGJ3ICsgYXcgKiBieCArIGF5ICogYnogLSBheiAqIGJ5O1xuICBvdXRbMV0gPSBheSAqIGJ3ICsgYXcgKiBieSArIGF6ICogYnggLSBheCAqIGJ6O1xuICBvdXRbMl0gPSBheiAqIGJ3ICsgYXcgKiBieiArIGF4ICogYnkgLSBheSAqIGJ4O1xuICBvdXRbM10gPSBhdyAqIGJ3IC0gYXggKiBieCAtIGF5ICogYnkgLSBheiAqIGJ6O1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIFJvdGF0ZXMgYSBxdWF0ZXJuaW9uIGJ5IHRoZSBnaXZlbiBhbmdsZSBhYm91dCB0aGUgWCBheGlzXHJcbiAqXHJcbiAqIEBwYXJhbSB7cXVhdH0gb3V0IHF1YXQgcmVjZWl2aW5nIG9wZXJhdGlvbiByZXN1bHRcclxuICogQHBhcmFtIHtxdWF0fSBhIHF1YXQgdG8gcm90YXRlXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSByYWQgYW5nbGUgKGluIHJhZGlhbnMpIHRvIHJvdGF0ZVxyXG4gKiBAcmV0dXJucyB7cXVhdH0gb3V0XHJcbiAqL1xuXG5cbmZ1bmN0aW9uIHJvdGF0ZVgob3V0LCBhLCByYWQpIHtcbiAgcmFkICo9IDAuNTtcbiAgdmFyIGF4ID0gYVswXSxcbiAgICAgIGF5ID0gYVsxXSxcbiAgICAgIGF6ID0gYVsyXSxcbiAgICAgIGF3ID0gYVszXTtcbiAgdmFyIGJ4ID0gTWF0aC5zaW4ocmFkKSxcbiAgICAgIGJ3ID0gTWF0aC5jb3MocmFkKTtcbiAgb3V0WzBdID0gYXggKiBidyArIGF3ICogYng7XG4gIG91dFsxXSA9IGF5ICogYncgKyBheiAqIGJ4O1xuICBvdXRbMl0gPSBheiAqIGJ3IC0gYXkgKiBieDtcbiAgb3V0WzNdID0gYXcgKiBidyAtIGF4ICogYng7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogUm90YXRlcyBhIHF1YXRlcm5pb24gYnkgdGhlIGdpdmVuIGFuZ2xlIGFib3V0IHRoZSBZIGF4aXNcclxuICpcclxuICogQHBhcmFtIHtxdWF0fSBvdXQgcXVhdCByZWNlaXZpbmcgb3BlcmF0aW9uIHJlc3VsdFxyXG4gKiBAcGFyYW0ge3F1YXR9IGEgcXVhdCB0byByb3RhdGVcclxuICogQHBhcmFtIHtudW1iZXJ9IHJhZCBhbmdsZSAoaW4gcmFkaWFucykgdG8gcm90YXRlXHJcbiAqIEByZXR1cm5zIHtxdWF0fSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gcm90YXRlWShvdXQsIGEsIHJhZCkge1xuICByYWQgKj0gMC41O1xuICB2YXIgYXggPSBhWzBdLFxuICAgICAgYXkgPSBhWzFdLFxuICAgICAgYXogPSBhWzJdLFxuICAgICAgYXcgPSBhWzNdO1xuICB2YXIgYnkgPSBNYXRoLnNpbihyYWQpLFxuICAgICAgYncgPSBNYXRoLmNvcyhyYWQpO1xuICBvdXRbMF0gPSBheCAqIGJ3IC0gYXogKiBieTtcbiAgb3V0WzFdID0gYXkgKiBidyArIGF3ICogYnk7XG4gIG91dFsyXSA9IGF6ICogYncgKyBheCAqIGJ5O1xuICBvdXRbM10gPSBhdyAqIGJ3IC0gYXkgKiBieTtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBSb3RhdGVzIGEgcXVhdGVybmlvbiBieSB0aGUgZ2l2ZW4gYW5nbGUgYWJvdXQgdGhlIFogYXhpc1xyXG4gKlxyXG4gKiBAcGFyYW0ge3F1YXR9IG91dCBxdWF0IHJlY2VpdmluZyBvcGVyYXRpb24gcmVzdWx0XHJcbiAqIEBwYXJhbSB7cXVhdH0gYSBxdWF0IHRvIHJvdGF0ZVxyXG4gKiBAcGFyYW0ge251bWJlcn0gcmFkIGFuZ2xlIChpbiByYWRpYW5zKSB0byByb3RhdGVcclxuICogQHJldHVybnMge3F1YXR9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiByb3RhdGVaKG91dCwgYSwgcmFkKSB7XG4gIHJhZCAqPSAwLjU7XG4gIHZhciBheCA9IGFbMF0sXG4gICAgICBheSA9IGFbMV0sXG4gICAgICBheiA9IGFbMl0sXG4gICAgICBhdyA9IGFbM107XG4gIHZhciBieiA9IE1hdGguc2luKHJhZCksXG4gICAgICBidyA9IE1hdGguY29zKHJhZCk7XG4gIG91dFswXSA9IGF4ICogYncgKyBheSAqIGJ6O1xuICBvdXRbMV0gPSBheSAqIGJ3IC0gYXggKiBiejtcbiAgb3V0WzJdID0gYXogKiBidyArIGF3ICogYno7XG4gIG91dFszXSA9IGF3ICogYncgLSBheiAqIGJ6O1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIENhbGN1bGF0ZXMgdGhlIFcgY29tcG9uZW50IG9mIGEgcXVhdCBmcm9tIHRoZSBYLCBZLCBhbmQgWiBjb21wb25lbnRzLlxyXG4gKiBBc3N1bWVzIHRoYXQgcXVhdGVybmlvbiBpcyAxIHVuaXQgaW4gbGVuZ3RoLlxyXG4gKiBBbnkgZXhpc3RpbmcgVyBjb21wb25lbnQgd2lsbCBiZSBpZ25vcmVkLlxyXG4gKlxyXG4gKiBAcGFyYW0ge3F1YXR9IG91dCB0aGUgcmVjZWl2aW5nIHF1YXRlcm5pb25cclxuICogQHBhcmFtIHtxdWF0fSBhIHF1YXQgdG8gY2FsY3VsYXRlIFcgY29tcG9uZW50IG9mXHJcbiAqIEByZXR1cm5zIHtxdWF0fSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gY2FsY3VsYXRlVyhvdXQsIGEpIHtcbiAgdmFyIHggPSBhWzBdLFxuICAgICAgeSA9IGFbMV0sXG4gICAgICB6ID0gYVsyXTtcbiAgb3V0WzBdID0geDtcbiAgb3V0WzFdID0geTtcbiAgb3V0WzJdID0gejtcbiAgb3V0WzNdID0gTWF0aC5zcXJ0KE1hdGguYWJzKDEuMCAtIHggKiB4IC0geSAqIHkgLSB6ICogeikpO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIENhbGN1bGF0ZSB0aGUgZXhwb25lbnRpYWwgb2YgYSB1bml0IHF1YXRlcm5pb24uXHJcbiAqXHJcbiAqIEBwYXJhbSB7cXVhdH0gb3V0IHRoZSByZWNlaXZpbmcgcXVhdGVybmlvblxyXG4gKiBAcGFyYW0ge3F1YXR9IGEgcXVhdCB0byBjYWxjdWxhdGUgdGhlIGV4cG9uZW50aWFsIG9mXHJcbiAqIEByZXR1cm5zIHtxdWF0fSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gZXhwKG91dCwgYSkge1xuICB2YXIgeCA9IGFbMF0sXG4gICAgICB5ID0gYVsxXSxcbiAgICAgIHogPSBhWzJdLFxuICAgICAgdyA9IGFbM107XG4gIHZhciByID0gTWF0aC5zcXJ0KHggKiB4ICsgeSAqIHkgKyB6ICogeik7XG4gIHZhciBldCA9IE1hdGguZXhwKHcpO1xuICB2YXIgcyA9IHIgPiAwID8gZXQgKiBNYXRoLnNpbihyKSAvIHIgOiAwO1xuICBvdXRbMF0gPSB4ICogcztcbiAgb3V0WzFdID0geSAqIHM7XG4gIG91dFsyXSA9IHogKiBzO1xuICBvdXRbM10gPSBldCAqIE1hdGguY29zKHIpO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIENhbGN1bGF0ZSB0aGUgbmF0dXJhbCBsb2dhcml0aG0gb2YgYSB1bml0IHF1YXRlcm5pb24uXHJcbiAqXHJcbiAqIEBwYXJhbSB7cXVhdH0gb3V0IHRoZSByZWNlaXZpbmcgcXVhdGVybmlvblxyXG4gKiBAcGFyYW0ge3F1YXR9IGEgcXVhdCB0byBjYWxjdWxhdGUgdGhlIGV4cG9uZW50aWFsIG9mXHJcbiAqIEByZXR1cm5zIHtxdWF0fSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gbG4ob3V0LCBhKSB7XG4gIHZhciB4ID0gYVswXSxcbiAgICAgIHkgPSBhWzFdLFxuICAgICAgeiA9IGFbMl0sXG4gICAgICB3ID0gYVszXTtcbiAgdmFyIHIgPSBNYXRoLnNxcnQoeCAqIHggKyB5ICogeSArIHogKiB6KTtcbiAgdmFyIHQgPSByID4gMCA/IE1hdGguYXRhbjIociwgdykgLyByIDogMDtcbiAgb3V0WzBdID0geCAqIHQ7XG4gIG91dFsxXSA9IHkgKiB0O1xuICBvdXRbMl0gPSB6ICogdDtcbiAgb3V0WzNdID0gMC41ICogTWF0aC5sb2coeCAqIHggKyB5ICogeSArIHogKiB6ICsgdyAqIHcpO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIENhbGN1bGF0ZSB0aGUgc2NhbGFyIHBvd2VyIG9mIGEgdW5pdCBxdWF0ZXJuaW9uLlxyXG4gKlxyXG4gKiBAcGFyYW0ge3F1YXR9IG91dCB0aGUgcmVjZWl2aW5nIHF1YXRlcm5pb25cclxuICogQHBhcmFtIHtxdWF0fSBhIHF1YXQgdG8gY2FsY3VsYXRlIHRoZSBleHBvbmVudGlhbCBvZlxyXG4gKiBAcGFyYW0ge051bWJlcn0gYiBhbW91bnQgdG8gc2NhbGUgdGhlIHF1YXRlcm5pb24gYnlcclxuICogQHJldHVybnMge3F1YXR9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBwb3cob3V0LCBhLCBiKSB7XG4gIGxuKG91dCwgYSk7XG4gIHNjYWxlKG91dCwgb3V0LCBiKTtcbiAgZXhwKG91dCwgb3V0KTtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBQZXJmb3JtcyBhIHNwaGVyaWNhbCBsaW5lYXIgaW50ZXJwb2xhdGlvbiBiZXR3ZWVuIHR3byBxdWF0XHJcbiAqXHJcbiAqIEBwYXJhbSB7cXVhdH0gb3V0IHRoZSByZWNlaXZpbmcgcXVhdGVybmlvblxyXG4gKiBAcGFyYW0ge3F1YXR9IGEgdGhlIGZpcnN0IG9wZXJhbmRcclxuICogQHBhcmFtIHtxdWF0fSBiIHRoZSBzZWNvbmQgb3BlcmFuZFxyXG4gKiBAcGFyYW0ge051bWJlcn0gdCBpbnRlcnBvbGF0aW9uIGFtb3VudCwgaW4gdGhlIHJhbmdlIFswLTFdLCBiZXR3ZWVuIHRoZSB0d28gaW5wdXRzXHJcbiAqIEByZXR1cm5zIHtxdWF0fSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gc2xlcnAob3V0LCBhLCBiLCB0KSB7XG4gIC8vIGJlbmNobWFya3M6XG4gIC8vICAgIGh0dHA6Ly9qc3BlcmYuY29tL3F1YXRlcm5pb24tc2xlcnAtaW1wbGVtZW50YXRpb25zXG4gIHZhciBheCA9IGFbMF0sXG4gICAgICBheSA9IGFbMV0sXG4gICAgICBheiA9IGFbMl0sXG4gICAgICBhdyA9IGFbM107XG4gIHZhciBieCA9IGJbMF0sXG4gICAgICBieSA9IGJbMV0sXG4gICAgICBieiA9IGJbMl0sXG4gICAgICBidyA9IGJbM107XG4gIHZhciBvbWVnYSwgY29zb20sIHNpbm9tLCBzY2FsZTAsIHNjYWxlMTsgLy8gY2FsYyBjb3NpbmVcblxuICBjb3NvbSA9IGF4ICogYnggKyBheSAqIGJ5ICsgYXogKiBieiArIGF3ICogYnc7IC8vIGFkanVzdCBzaWducyAoaWYgbmVjZXNzYXJ5KVxuXG4gIGlmIChjb3NvbSA8IDAuMCkge1xuICAgIGNvc29tID0gLWNvc29tO1xuICAgIGJ4ID0gLWJ4O1xuICAgIGJ5ID0gLWJ5O1xuICAgIGJ6ID0gLWJ6O1xuICAgIGJ3ID0gLWJ3O1xuICB9IC8vIGNhbGN1bGF0ZSBjb2VmZmljaWVudHNcblxuXG4gIGlmICgxLjAgLSBjb3NvbSA+IGdsTWF0cml4LkVQU0lMT04pIHtcbiAgICAvLyBzdGFuZGFyZCBjYXNlIChzbGVycClcbiAgICBvbWVnYSA9IE1hdGguYWNvcyhjb3NvbSk7XG4gICAgc2lub20gPSBNYXRoLnNpbihvbWVnYSk7XG4gICAgc2NhbGUwID0gTWF0aC5zaW4oKDEuMCAtIHQpICogb21lZ2EpIC8gc2lub207XG4gICAgc2NhbGUxID0gTWF0aC5zaW4odCAqIG9tZWdhKSAvIHNpbm9tO1xuICB9IGVsc2Uge1xuICAgIC8vIFwiZnJvbVwiIGFuZCBcInRvXCIgcXVhdGVybmlvbnMgYXJlIHZlcnkgY2xvc2VcbiAgICAvLyAgLi4uIHNvIHdlIGNhbiBkbyBhIGxpbmVhciBpbnRlcnBvbGF0aW9uXG4gICAgc2NhbGUwID0gMS4wIC0gdDtcbiAgICBzY2FsZTEgPSB0O1xuICB9IC8vIGNhbGN1bGF0ZSBmaW5hbCB2YWx1ZXNcblxuXG4gIG91dFswXSA9IHNjYWxlMCAqIGF4ICsgc2NhbGUxICogYng7XG4gIG91dFsxXSA9IHNjYWxlMCAqIGF5ICsgc2NhbGUxICogYnk7XG4gIG91dFsyXSA9IHNjYWxlMCAqIGF6ICsgc2NhbGUxICogYno7XG4gIG91dFszXSA9IHNjYWxlMCAqIGF3ICsgc2NhbGUxICogYnc7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogR2VuZXJhdGVzIGEgcmFuZG9tIHVuaXQgcXVhdGVybmlvblxyXG4gKlxyXG4gKiBAcGFyYW0ge3F1YXR9IG91dCB0aGUgcmVjZWl2aW5nIHF1YXRlcm5pb25cclxuICogQHJldHVybnMge3F1YXR9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiByYW5kb20ob3V0KSB7XG4gIC8vIEltcGxlbWVudGF0aW9uIG9mIGh0dHA6Ly9wbGFubmluZy5jcy51aXVjLmVkdS9ub2RlMTk4Lmh0bWxcbiAgLy8gVE9ETzogQ2FsbGluZyByYW5kb20gMyB0aW1lcyBpcyBwcm9iYWJseSBub3QgdGhlIGZhc3Rlc3Qgc29sdXRpb25cbiAgdmFyIHUxID0gZ2xNYXRyaXguUkFORE9NKCk7XG4gIHZhciB1MiA9IGdsTWF0cml4LlJBTkRPTSgpO1xuICB2YXIgdTMgPSBnbE1hdHJpeC5SQU5ET00oKTtcbiAgdmFyIHNxcnQxTWludXNVMSA9IE1hdGguc3FydCgxIC0gdTEpO1xuICB2YXIgc3FydFUxID0gTWF0aC5zcXJ0KHUxKTtcbiAgb3V0WzBdID0gc3FydDFNaW51c1UxICogTWF0aC5zaW4oMi4wICogTWF0aC5QSSAqIHUyKTtcbiAgb3V0WzFdID0gc3FydDFNaW51c1UxICogTWF0aC5jb3MoMi4wICogTWF0aC5QSSAqIHUyKTtcbiAgb3V0WzJdID0gc3FydFUxICogTWF0aC5zaW4oMi4wICogTWF0aC5QSSAqIHUzKTtcbiAgb3V0WzNdID0gc3FydFUxICogTWF0aC5jb3MoMi4wICogTWF0aC5QSSAqIHUzKTtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBDYWxjdWxhdGVzIHRoZSBpbnZlcnNlIG9mIGEgcXVhdFxyXG4gKlxyXG4gKiBAcGFyYW0ge3F1YXR9IG91dCB0aGUgcmVjZWl2aW5nIHF1YXRlcm5pb25cclxuICogQHBhcmFtIHtxdWF0fSBhIHF1YXQgdG8gY2FsY3VsYXRlIGludmVyc2Ugb2ZcclxuICogQHJldHVybnMge3F1YXR9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBpbnZlcnQob3V0LCBhKSB7XG4gIHZhciBhMCA9IGFbMF0sXG4gICAgICBhMSA9IGFbMV0sXG4gICAgICBhMiA9IGFbMl0sXG4gICAgICBhMyA9IGFbM107XG4gIHZhciBkb3QgPSBhMCAqIGEwICsgYTEgKiBhMSArIGEyICogYTIgKyBhMyAqIGEzO1xuICB2YXIgaW52RG90ID0gZG90ID8gMS4wIC8gZG90IDogMDsgLy8gVE9ETzogV291bGQgYmUgZmFzdGVyIHRvIHJldHVybiBbMCwwLDAsMF0gaW1tZWRpYXRlbHkgaWYgZG90ID09IDBcblxuICBvdXRbMF0gPSAtYTAgKiBpbnZEb3Q7XG4gIG91dFsxXSA9IC1hMSAqIGludkRvdDtcbiAgb3V0WzJdID0gLWEyICogaW52RG90O1xuICBvdXRbM10gPSBhMyAqIGludkRvdDtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBDYWxjdWxhdGVzIHRoZSBjb25qdWdhdGUgb2YgYSBxdWF0XHJcbiAqIElmIHRoZSBxdWF0ZXJuaW9uIGlzIG5vcm1hbGl6ZWQsIHRoaXMgZnVuY3Rpb24gaXMgZmFzdGVyIHRoYW4gcXVhdC5pbnZlcnNlIGFuZCBwcm9kdWNlcyB0aGUgc2FtZSByZXN1bHQuXHJcbiAqXHJcbiAqIEBwYXJhbSB7cXVhdH0gb3V0IHRoZSByZWNlaXZpbmcgcXVhdGVybmlvblxyXG4gKiBAcGFyYW0ge3F1YXR9IGEgcXVhdCB0byBjYWxjdWxhdGUgY29uanVnYXRlIG9mXHJcbiAqIEByZXR1cm5zIHtxdWF0fSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gY29uanVnYXRlKG91dCwgYSkge1xuICBvdXRbMF0gPSAtYVswXTtcbiAgb3V0WzFdID0gLWFbMV07XG4gIG91dFsyXSA9IC1hWzJdO1xuICBvdXRbM10gPSBhWzNdO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIENyZWF0ZXMgYSBxdWF0ZXJuaW9uIGZyb20gdGhlIGdpdmVuIDN4MyByb3RhdGlvbiBtYXRyaXguXHJcbiAqXHJcbiAqIE5PVEU6IFRoZSByZXN1bHRhbnQgcXVhdGVybmlvbiBpcyBub3Qgbm9ybWFsaXplZCwgc28geW91IHNob3VsZCBiZSBzdXJlXHJcbiAqIHRvIHJlbm9ybWFsaXplIHRoZSBxdWF0ZXJuaW9uIHlvdXJzZWxmIHdoZXJlIG5lY2Vzc2FyeS5cclxuICpcclxuICogQHBhcmFtIHtxdWF0fSBvdXQgdGhlIHJlY2VpdmluZyBxdWF0ZXJuaW9uXHJcbiAqIEBwYXJhbSB7bWF0M30gbSByb3RhdGlvbiBtYXRyaXhcclxuICogQHJldHVybnMge3F1YXR9IG91dFxyXG4gKiBAZnVuY3Rpb25cclxuICovXG5cblxuZnVuY3Rpb24gZnJvbU1hdDMob3V0LCBtKSB7XG4gIC8vIEFsZ29yaXRobSBpbiBLZW4gU2hvZW1ha2UncyBhcnRpY2xlIGluIDE5ODcgU0lHR1JBUEggY291cnNlIG5vdGVzXG4gIC8vIGFydGljbGUgXCJRdWF0ZXJuaW9uIENhbGN1bHVzIGFuZCBGYXN0IEFuaW1hdGlvblwiLlxuICB2YXIgZlRyYWNlID0gbVswXSArIG1bNF0gKyBtWzhdO1xuICB2YXIgZlJvb3Q7XG5cbiAgaWYgKGZUcmFjZSA+IDAuMCkge1xuICAgIC8vIHx3fCA+IDEvMiwgbWF5IGFzIHdlbGwgY2hvb3NlIHcgPiAxLzJcbiAgICBmUm9vdCA9IE1hdGguc3FydChmVHJhY2UgKyAxLjApOyAvLyAyd1xuXG4gICAgb3V0WzNdID0gMC41ICogZlJvb3Q7XG4gICAgZlJvb3QgPSAwLjUgLyBmUm9vdDsgLy8gMS8oNHcpXG5cbiAgICBvdXRbMF0gPSAobVs1XSAtIG1bN10pICogZlJvb3Q7XG4gICAgb3V0WzFdID0gKG1bNl0gLSBtWzJdKSAqIGZSb290O1xuICAgIG91dFsyXSA9IChtWzFdIC0gbVszXSkgKiBmUm9vdDtcbiAgfSBlbHNlIHtcbiAgICAvLyB8d3wgPD0gMS8yXG4gICAgdmFyIGkgPSAwO1xuICAgIGlmIChtWzRdID4gbVswXSkgaSA9IDE7XG4gICAgaWYgKG1bOF0gPiBtW2kgKiAzICsgaV0pIGkgPSAyO1xuICAgIHZhciBqID0gKGkgKyAxKSAlIDM7XG4gICAgdmFyIGsgPSAoaSArIDIpICUgMztcbiAgICBmUm9vdCA9IE1hdGguc3FydChtW2kgKiAzICsgaV0gLSBtW2ogKiAzICsgal0gLSBtW2sgKiAzICsga10gKyAxLjApO1xuICAgIG91dFtpXSA9IDAuNSAqIGZSb290O1xuICAgIGZSb290ID0gMC41IC8gZlJvb3Q7XG4gICAgb3V0WzNdID0gKG1baiAqIDMgKyBrXSAtIG1bayAqIDMgKyBqXSkgKiBmUm9vdDtcbiAgICBvdXRbal0gPSAobVtqICogMyArIGldICsgbVtpICogMyArIGpdKSAqIGZSb290O1xuICAgIG91dFtrXSA9IChtW2sgKiAzICsgaV0gKyBtW2kgKiAzICsga10pICogZlJvb3Q7XG4gIH1cblxuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIENyZWF0ZXMgYSBxdWF0ZXJuaW9uIGZyb20gdGhlIGdpdmVuIGV1bGVyIGFuZ2xlIHgsIHksIHouXHJcbiAqXHJcbiAqIEBwYXJhbSB7cXVhdH0gb3V0IHRoZSByZWNlaXZpbmcgcXVhdGVybmlvblxyXG4gKiBAcGFyYW0ge3h9IEFuZ2xlIHRvIHJvdGF0ZSBhcm91bmQgWCBheGlzIGluIGRlZ3JlZXMuXHJcbiAqIEBwYXJhbSB7eX0gQW5nbGUgdG8gcm90YXRlIGFyb3VuZCBZIGF4aXMgaW4gZGVncmVlcy5cclxuICogQHBhcmFtIHt6fSBBbmdsZSB0byByb3RhdGUgYXJvdW5kIFogYXhpcyBpbiBkZWdyZWVzLlxyXG4gKiBAcmV0dXJucyB7cXVhdH0gb3V0XHJcbiAqIEBmdW5jdGlvblxyXG4gKi9cblxuXG5mdW5jdGlvbiBmcm9tRXVsZXIob3V0LCB4LCB5LCB6KSB7XG4gIHZhciBoYWxmVG9SYWQgPSAwLjUgKiBNYXRoLlBJIC8gMTgwLjA7XG4gIHggKj0gaGFsZlRvUmFkO1xuICB5ICo9IGhhbGZUb1JhZDtcbiAgeiAqPSBoYWxmVG9SYWQ7XG4gIHZhciBzeCA9IE1hdGguc2luKHgpO1xuICB2YXIgY3ggPSBNYXRoLmNvcyh4KTtcbiAgdmFyIHN5ID0gTWF0aC5zaW4oeSk7XG4gIHZhciBjeSA9IE1hdGguY29zKHkpO1xuICB2YXIgc3ogPSBNYXRoLnNpbih6KTtcbiAgdmFyIGN6ID0gTWF0aC5jb3Moeik7XG4gIG91dFswXSA9IHN4ICogY3kgKiBjeiAtIGN4ICogc3kgKiBzejtcbiAgb3V0WzFdID0gY3ggKiBzeSAqIGN6ICsgc3ggKiBjeSAqIHN6O1xuICBvdXRbMl0gPSBjeCAqIGN5ICogc3ogLSBzeCAqIHN5ICogY3o7XG4gIG91dFszXSA9IGN4ICogY3kgKiBjeiArIHN4ICogc3kgKiBzejtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBSZXR1cm5zIGEgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIGEgcXVhdGVuaW9uXHJcbiAqXHJcbiAqIEBwYXJhbSB7cXVhdH0gYSB2ZWN0b3IgdG8gcmVwcmVzZW50IGFzIGEgc3RyaW5nXHJcbiAqIEByZXR1cm5zIHtTdHJpbmd9IHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiB0aGUgdmVjdG9yXHJcbiAqL1xuXG5cbmZ1bmN0aW9uIHN0cihhKSB7XG4gIHJldHVybiBcInF1YXQoXCIgKyBhWzBdICsgXCIsIFwiICsgYVsxXSArIFwiLCBcIiArIGFbMl0gKyBcIiwgXCIgKyBhWzNdICsgXCIpXCI7XG59XG4vKipcclxuICogQ3JlYXRlcyBhIG5ldyBxdWF0IGluaXRpYWxpemVkIHdpdGggdmFsdWVzIGZyb20gYW4gZXhpc3RpbmcgcXVhdGVybmlvblxyXG4gKlxyXG4gKiBAcGFyYW0ge3F1YXR9IGEgcXVhdGVybmlvbiB0byBjbG9uZVxyXG4gKiBAcmV0dXJucyB7cXVhdH0gYSBuZXcgcXVhdGVybmlvblxyXG4gKiBAZnVuY3Rpb25cclxuICovXG5cblxudmFyIGNsb25lID0gdmVjNC5jbG9uZTtcbi8qKlxyXG4gKiBDcmVhdGVzIGEgbmV3IHF1YXQgaW5pdGlhbGl6ZWQgd2l0aCB0aGUgZ2l2ZW4gdmFsdWVzXHJcbiAqXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSB4IFggY29tcG9uZW50XHJcbiAqIEBwYXJhbSB7TnVtYmVyfSB5IFkgY29tcG9uZW50XHJcbiAqIEBwYXJhbSB7TnVtYmVyfSB6IFogY29tcG9uZW50XHJcbiAqIEBwYXJhbSB7TnVtYmVyfSB3IFcgY29tcG9uZW50XHJcbiAqIEByZXR1cm5zIHtxdWF0fSBhIG5ldyBxdWF0ZXJuaW9uXHJcbiAqIEBmdW5jdGlvblxyXG4gKi9cblxuZXhwb3J0cy5jbG9uZSA9IGNsb25lO1xudmFyIGZyb21WYWx1ZXMgPSB2ZWM0LmZyb21WYWx1ZXM7XG4vKipcclxuICogQ29weSB0aGUgdmFsdWVzIGZyb20gb25lIHF1YXQgdG8gYW5vdGhlclxyXG4gKlxyXG4gKiBAcGFyYW0ge3F1YXR9IG91dCB0aGUgcmVjZWl2aW5nIHF1YXRlcm5pb25cclxuICogQHBhcmFtIHtxdWF0fSBhIHRoZSBzb3VyY2UgcXVhdGVybmlvblxyXG4gKiBAcmV0dXJucyB7cXVhdH0gb3V0XHJcbiAqIEBmdW5jdGlvblxyXG4gKi9cblxuZXhwb3J0cy5mcm9tVmFsdWVzID0gZnJvbVZhbHVlcztcbnZhciBjb3B5ID0gdmVjNC5jb3B5O1xuLyoqXHJcbiAqIFNldCB0aGUgY29tcG9uZW50cyBvZiBhIHF1YXQgdG8gdGhlIGdpdmVuIHZhbHVlc1xyXG4gKlxyXG4gKiBAcGFyYW0ge3F1YXR9IG91dCB0aGUgcmVjZWl2aW5nIHF1YXRlcm5pb25cclxuICogQHBhcmFtIHtOdW1iZXJ9IHggWCBjb21wb25lbnRcclxuICogQHBhcmFtIHtOdW1iZXJ9IHkgWSBjb21wb25lbnRcclxuICogQHBhcmFtIHtOdW1iZXJ9IHogWiBjb21wb25lbnRcclxuICogQHBhcmFtIHtOdW1iZXJ9IHcgVyBjb21wb25lbnRcclxuICogQHJldHVybnMge3F1YXR9IG91dFxyXG4gKiBAZnVuY3Rpb25cclxuICovXG5cbmV4cG9ydHMuY29weSA9IGNvcHk7XG52YXIgc2V0ID0gdmVjNC5zZXQ7XG4vKipcclxuICogQWRkcyB0d28gcXVhdCdzXHJcbiAqXHJcbiAqIEBwYXJhbSB7cXVhdH0gb3V0IHRoZSByZWNlaXZpbmcgcXVhdGVybmlvblxyXG4gKiBAcGFyYW0ge3F1YXR9IGEgdGhlIGZpcnN0IG9wZXJhbmRcclxuICogQHBhcmFtIHtxdWF0fSBiIHRoZSBzZWNvbmQgb3BlcmFuZFxyXG4gKiBAcmV0dXJucyB7cXVhdH0gb3V0XHJcbiAqIEBmdW5jdGlvblxyXG4gKi9cblxuZXhwb3J0cy5zZXQgPSBzZXQ7XG52YXIgYWRkID0gdmVjNC5hZGQ7XG4vKipcclxuICogQWxpYXMgZm9yIHtAbGluayBxdWF0Lm11bHRpcGx5fVxyXG4gKiBAZnVuY3Rpb25cclxuICovXG5cbmV4cG9ydHMuYWRkID0gYWRkO1xudmFyIG11bCA9IG11bHRpcGx5O1xuLyoqXHJcbiAqIFNjYWxlcyBhIHF1YXQgYnkgYSBzY2FsYXIgbnVtYmVyXHJcbiAqXHJcbiAqIEBwYXJhbSB7cXVhdH0gb3V0IHRoZSByZWNlaXZpbmcgdmVjdG9yXHJcbiAqIEBwYXJhbSB7cXVhdH0gYSB0aGUgdmVjdG9yIHRvIHNjYWxlXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBiIGFtb3VudCB0byBzY2FsZSB0aGUgdmVjdG9yIGJ5XHJcbiAqIEByZXR1cm5zIHtxdWF0fSBvdXRcclxuICogQGZ1bmN0aW9uXHJcbiAqL1xuXG5leHBvcnRzLm11bCA9IG11bDtcbnZhciBzY2FsZSA9IHZlYzQuc2NhbGU7XG4vKipcclxuICogQ2FsY3VsYXRlcyB0aGUgZG90IHByb2R1Y3Qgb2YgdHdvIHF1YXQnc1xyXG4gKlxyXG4gKiBAcGFyYW0ge3F1YXR9IGEgdGhlIGZpcnN0IG9wZXJhbmRcclxuICogQHBhcmFtIHtxdWF0fSBiIHRoZSBzZWNvbmQgb3BlcmFuZFxyXG4gKiBAcmV0dXJucyB7TnVtYmVyfSBkb3QgcHJvZHVjdCBvZiBhIGFuZCBiXHJcbiAqIEBmdW5jdGlvblxyXG4gKi9cblxuZXhwb3J0cy5zY2FsZSA9IHNjYWxlO1xudmFyIGRvdCA9IHZlYzQuZG90O1xuLyoqXHJcbiAqIFBlcmZvcm1zIGEgbGluZWFyIGludGVycG9sYXRpb24gYmV0d2VlbiB0d28gcXVhdCdzXHJcbiAqXHJcbiAqIEBwYXJhbSB7cXVhdH0gb3V0IHRoZSByZWNlaXZpbmcgcXVhdGVybmlvblxyXG4gKiBAcGFyYW0ge3F1YXR9IGEgdGhlIGZpcnN0IG9wZXJhbmRcclxuICogQHBhcmFtIHtxdWF0fSBiIHRoZSBzZWNvbmQgb3BlcmFuZFxyXG4gKiBAcGFyYW0ge051bWJlcn0gdCBpbnRlcnBvbGF0aW9uIGFtb3VudCwgaW4gdGhlIHJhbmdlIFswLTFdLCBiZXR3ZWVuIHRoZSB0d28gaW5wdXRzXHJcbiAqIEByZXR1cm5zIHtxdWF0fSBvdXRcclxuICogQGZ1bmN0aW9uXHJcbiAqL1xuXG5leHBvcnRzLmRvdCA9IGRvdDtcbnZhciBsZXJwID0gdmVjNC5sZXJwO1xuLyoqXHJcbiAqIENhbGN1bGF0ZXMgdGhlIGxlbmd0aCBvZiBhIHF1YXRcclxuICpcclxuICogQHBhcmFtIHtxdWF0fSBhIHZlY3RvciB0byBjYWxjdWxhdGUgbGVuZ3RoIG9mXHJcbiAqIEByZXR1cm5zIHtOdW1iZXJ9IGxlbmd0aCBvZiBhXHJcbiAqL1xuXG5leHBvcnRzLmxlcnAgPSBsZXJwO1xudmFyIGxlbmd0aCA9IHZlYzQubGVuZ3RoO1xuLyoqXHJcbiAqIEFsaWFzIGZvciB7QGxpbmsgcXVhdC5sZW5ndGh9XHJcbiAqIEBmdW5jdGlvblxyXG4gKi9cblxuZXhwb3J0cy5sZW5ndGggPSBsZW5ndGg7XG52YXIgbGVuID0gbGVuZ3RoO1xuLyoqXHJcbiAqIENhbGN1bGF0ZXMgdGhlIHNxdWFyZWQgbGVuZ3RoIG9mIGEgcXVhdFxyXG4gKlxyXG4gKiBAcGFyYW0ge3F1YXR9IGEgdmVjdG9yIHRvIGNhbGN1bGF0ZSBzcXVhcmVkIGxlbmd0aCBvZlxyXG4gKiBAcmV0dXJucyB7TnVtYmVyfSBzcXVhcmVkIGxlbmd0aCBvZiBhXHJcbiAqIEBmdW5jdGlvblxyXG4gKi9cblxuZXhwb3J0cy5sZW4gPSBsZW47XG52YXIgc3F1YXJlZExlbmd0aCA9IHZlYzQuc3F1YXJlZExlbmd0aDtcbi8qKlxyXG4gKiBBbGlhcyBmb3Ige0BsaW5rIHF1YXQuc3F1YXJlZExlbmd0aH1cclxuICogQGZ1bmN0aW9uXHJcbiAqL1xuXG5leHBvcnRzLnNxdWFyZWRMZW5ndGggPSBzcXVhcmVkTGVuZ3RoO1xudmFyIHNxckxlbiA9IHNxdWFyZWRMZW5ndGg7XG4vKipcclxuICogTm9ybWFsaXplIGEgcXVhdFxyXG4gKlxyXG4gKiBAcGFyYW0ge3F1YXR9IG91dCB0aGUgcmVjZWl2aW5nIHF1YXRlcm5pb25cclxuICogQHBhcmFtIHtxdWF0fSBhIHF1YXRlcm5pb24gdG8gbm9ybWFsaXplXHJcbiAqIEByZXR1cm5zIHtxdWF0fSBvdXRcclxuICogQGZ1bmN0aW9uXHJcbiAqL1xuXG5leHBvcnRzLnNxckxlbiA9IHNxckxlbjtcbnZhciBub3JtYWxpemUgPSB2ZWM0Lm5vcm1hbGl6ZTtcbi8qKlxyXG4gKiBSZXR1cm5zIHdoZXRoZXIgb3Igbm90IHRoZSBxdWF0ZXJuaW9ucyBoYXZlIGV4YWN0bHkgdGhlIHNhbWUgZWxlbWVudHMgaW4gdGhlIHNhbWUgcG9zaXRpb24gKHdoZW4gY29tcGFyZWQgd2l0aCA9PT0pXHJcbiAqXHJcbiAqIEBwYXJhbSB7cXVhdH0gYSBUaGUgZmlyc3QgcXVhdGVybmlvbi5cclxuICogQHBhcmFtIHtxdWF0fSBiIFRoZSBzZWNvbmQgcXVhdGVybmlvbi5cclxuICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgdGhlIHZlY3RvcnMgYXJlIGVxdWFsLCBmYWxzZSBvdGhlcndpc2UuXHJcbiAqL1xuXG5leHBvcnRzLm5vcm1hbGl6ZSA9IG5vcm1hbGl6ZTtcbnZhciBleGFjdEVxdWFscyA9IHZlYzQuZXhhY3RFcXVhbHM7XG4vKipcclxuICogUmV0dXJucyB3aGV0aGVyIG9yIG5vdCB0aGUgcXVhdGVybmlvbnMgaGF2ZSBhcHByb3hpbWF0ZWx5IHRoZSBzYW1lIGVsZW1lbnRzIGluIHRoZSBzYW1lIHBvc2l0aW9uLlxyXG4gKlxyXG4gKiBAcGFyYW0ge3F1YXR9IGEgVGhlIGZpcnN0IHZlY3Rvci5cclxuICogQHBhcmFtIHtxdWF0fSBiIFRoZSBzZWNvbmQgdmVjdG9yLlxyXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgdmVjdG9ycyBhcmUgZXF1YWwsIGZhbHNlIG90aGVyd2lzZS5cclxuICovXG5cbmV4cG9ydHMuZXhhY3RFcXVhbHMgPSBleGFjdEVxdWFscztcbnZhciBlcXVhbHMgPSB2ZWM0LmVxdWFscztcbi8qKlxyXG4gKiBTZXRzIGEgcXVhdGVybmlvbiB0byByZXByZXNlbnQgdGhlIHNob3J0ZXN0IHJvdGF0aW9uIGZyb20gb25lXHJcbiAqIHZlY3RvciB0byBhbm90aGVyLlxyXG4gKlxyXG4gKiBCb3RoIHZlY3RvcnMgYXJlIGFzc3VtZWQgdG8gYmUgdW5pdCBsZW5ndGguXHJcbiAqXHJcbiAqIEBwYXJhbSB7cXVhdH0gb3V0IHRoZSByZWNlaXZpbmcgcXVhdGVybmlvbi5cclxuICogQHBhcmFtIHt2ZWMzfSBhIHRoZSBpbml0aWFsIHZlY3RvclxyXG4gKiBAcGFyYW0ge3ZlYzN9IGIgdGhlIGRlc3RpbmF0aW9uIHZlY3RvclxyXG4gKiBAcmV0dXJucyB7cXVhdH0gb3V0XHJcbiAqL1xuXG5leHBvcnRzLmVxdWFscyA9IGVxdWFscztcblxudmFyIHJvdGF0aW9uVG8gPSBmdW5jdGlvbiAoKSB7XG4gIHZhciB0bXB2ZWMzID0gdmVjMy5jcmVhdGUoKTtcbiAgdmFyIHhVbml0VmVjMyA9IHZlYzMuZnJvbVZhbHVlcygxLCAwLCAwKTtcbiAgdmFyIHlVbml0VmVjMyA9IHZlYzMuZnJvbVZhbHVlcygwLCAxLCAwKTtcbiAgcmV0dXJuIGZ1bmN0aW9uIChvdXQsIGEsIGIpIHtcbiAgICB2YXIgZG90ID0gdmVjMy5kb3QoYSwgYik7XG5cbiAgICBpZiAoZG90IDwgLTAuOTk5OTk5KSB7XG4gICAgICB2ZWMzLmNyb3NzKHRtcHZlYzMsIHhVbml0VmVjMywgYSk7XG4gICAgICBpZiAodmVjMy5sZW4odG1wdmVjMykgPCAwLjAwMDAwMSkgdmVjMy5jcm9zcyh0bXB2ZWMzLCB5VW5pdFZlYzMsIGEpO1xuICAgICAgdmVjMy5ub3JtYWxpemUodG1wdmVjMywgdG1wdmVjMyk7XG4gICAgICBzZXRBeGlzQW5nbGUob3V0LCB0bXB2ZWMzLCBNYXRoLlBJKTtcbiAgICAgIHJldHVybiBvdXQ7XG4gICAgfSBlbHNlIGlmIChkb3QgPiAwLjk5OTk5OSkge1xuICAgICAgb3V0WzBdID0gMDtcbiAgICAgIG91dFsxXSA9IDA7XG4gICAgICBvdXRbMl0gPSAwO1xuICAgICAgb3V0WzNdID0gMTtcbiAgICAgIHJldHVybiBvdXQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZlYzMuY3Jvc3ModG1wdmVjMywgYSwgYik7XG4gICAgICBvdXRbMF0gPSB0bXB2ZWMzWzBdO1xuICAgICAgb3V0WzFdID0gdG1wdmVjM1sxXTtcbiAgICAgIG91dFsyXSA9IHRtcHZlYzNbMl07XG4gICAgICBvdXRbM10gPSAxICsgZG90O1xuICAgICAgcmV0dXJuIG5vcm1hbGl6ZShvdXQsIG91dCk7XG4gICAgfVxuICB9O1xufSgpO1xuLyoqXHJcbiAqIFBlcmZvcm1zIGEgc3BoZXJpY2FsIGxpbmVhciBpbnRlcnBvbGF0aW9uIHdpdGggdHdvIGNvbnRyb2wgcG9pbnRzXHJcbiAqXHJcbiAqIEBwYXJhbSB7cXVhdH0gb3V0IHRoZSByZWNlaXZpbmcgcXVhdGVybmlvblxyXG4gKiBAcGFyYW0ge3F1YXR9IGEgdGhlIGZpcnN0IG9wZXJhbmRcclxuICogQHBhcmFtIHtxdWF0fSBiIHRoZSBzZWNvbmQgb3BlcmFuZFxyXG4gKiBAcGFyYW0ge3F1YXR9IGMgdGhlIHRoaXJkIG9wZXJhbmRcclxuICogQHBhcmFtIHtxdWF0fSBkIHRoZSBmb3VydGggb3BlcmFuZFxyXG4gKiBAcGFyYW0ge051bWJlcn0gdCBpbnRlcnBvbGF0aW9uIGFtb3VudCwgaW4gdGhlIHJhbmdlIFswLTFdLCBiZXR3ZWVuIHRoZSB0d28gaW5wdXRzXHJcbiAqIEByZXR1cm5zIHtxdWF0fSBvdXRcclxuICovXG5cblxuZXhwb3J0cy5yb3RhdGlvblRvID0gcm90YXRpb25UbztcblxudmFyIHNxbGVycCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHRlbXAxID0gY3JlYXRlKCk7XG4gIHZhciB0ZW1wMiA9IGNyZWF0ZSgpO1xuICByZXR1cm4gZnVuY3Rpb24gKG91dCwgYSwgYiwgYywgZCwgdCkge1xuICAgIHNsZXJwKHRlbXAxLCBhLCBkLCB0KTtcbiAgICBzbGVycCh0ZW1wMiwgYiwgYywgdCk7XG4gICAgc2xlcnAob3V0LCB0ZW1wMSwgdGVtcDIsIDIgKiB0ICogKDEgLSB0KSk7XG4gICAgcmV0dXJuIG91dDtcbiAgfTtcbn0oKTtcbi8qKlxyXG4gKiBTZXRzIHRoZSBzcGVjaWZpZWQgcXVhdGVybmlvbiB3aXRoIHZhbHVlcyBjb3JyZXNwb25kaW5nIHRvIHRoZSBnaXZlblxyXG4gKiBheGVzLiBFYWNoIGF4aXMgaXMgYSB2ZWMzIGFuZCBpcyBleHBlY3RlZCB0byBiZSB1bml0IGxlbmd0aCBhbmRcclxuICogcGVycGVuZGljdWxhciB0byBhbGwgb3RoZXIgc3BlY2lmaWVkIGF4ZXMuXHJcbiAqXHJcbiAqIEBwYXJhbSB7dmVjM30gdmlldyAgdGhlIHZlY3RvciByZXByZXNlbnRpbmcgdGhlIHZpZXdpbmcgZGlyZWN0aW9uXHJcbiAqIEBwYXJhbSB7dmVjM30gcmlnaHQgdGhlIHZlY3RvciByZXByZXNlbnRpbmcgdGhlIGxvY2FsIFwicmlnaHRcIiBkaXJlY3Rpb25cclxuICogQHBhcmFtIHt2ZWMzfSB1cCAgICB0aGUgdmVjdG9yIHJlcHJlc2VudGluZyB0aGUgbG9jYWwgXCJ1cFwiIGRpcmVjdGlvblxyXG4gKiBAcmV0dXJucyB7cXVhdH0gb3V0XHJcbiAqL1xuXG5cbmV4cG9ydHMuc3FsZXJwID0gc3FsZXJwO1xuXG52YXIgc2V0QXhlcyA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIG1hdHIgPSBtYXQzLmNyZWF0ZSgpO1xuICByZXR1cm4gZnVuY3Rpb24gKG91dCwgdmlldywgcmlnaHQsIHVwKSB7XG4gICAgbWF0clswXSA9IHJpZ2h0WzBdO1xuICAgIG1hdHJbM10gPSByaWdodFsxXTtcbiAgICBtYXRyWzZdID0gcmlnaHRbMl07XG4gICAgbWF0clsxXSA9IHVwWzBdO1xuICAgIG1hdHJbNF0gPSB1cFsxXTtcbiAgICBtYXRyWzddID0gdXBbMl07XG4gICAgbWF0clsyXSA9IC12aWV3WzBdO1xuICAgIG1hdHJbNV0gPSAtdmlld1sxXTtcbiAgICBtYXRyWzhdID0gLXZpZXdbMl07XG4gICAgcmV0dXJuIG5vcm1hbGl6ZShvdXQsIGZyb21NYXQzKG91dCwgbWF0cikpO1xuICB9O1xufSgpO1xuXG5leHBvcnRzLnNldEF4ZXMgPSBzZXRBeGVzOyIsIlwidXNlIHN0cmljdFwiO1xuXG5mdW5jdGlvbiBfdHlwZW9mKG9iaikgeyBcIkBiYWJlbC9oZWxwZXJzIC0gdHlwZW9mXCI7IGlmICh0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIFN5bWJvbC5pdGVyYXRvciA9PT0gXCJzeW1ib2xcIikgeyBfdHlwZW9mID0gZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgcmV0dXJuIHR5cGVvZiBvYmo7IH07IH0gZWxzZSB7IF90eXBlb2YgPSBmdW5jdGlvbiBfdHlwZW9mKG9iaikgeyByZXR1cm4gb2JqICYmIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvYmouY29uc3RydWN0b3IgPT09IFN5bWJvbCAmJiBvYmogIT09IFN5bWJvbC5wcm90b3R5cGUgPyBcInN5bWJvbFwiIDogdHlwZW9mIG9iajsgfTsgfSByZXR1cm4gX3R5cGVvZihvYmopOyB9XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmNyZWF0ZSA9IGNyZWF0ZTtcbmV4cG9ydHMuY2xvbmUgPSBjbG9uZTtcbmV4cG9ydHMuZnJvbVZhbHVlcyA9IGZyb21WYWx1ZXM7XG5leHBvcnRzLmZyb21Sb3RhdGlvblRyYW5zbGF0aW9uVmFsdWVzID0gZnJvbVJvdGF0aW9uVHJhbnNsYXRpb25WYWx1ZXM7XG5leHBvcnRzLmZyb21Sb3RhdGlvblRyYW5zbGF0aW9uID0gZnJvbVJvdGF0aW9uVHJhbnNsYXRpb247XG5leHBvcnRzLmZyb21UcmFuc2xhdGlvbiA9IGZyb21UcmFuc2xhdGlvbjtcbmV4cG9ydHMuZnJvbVJvdGF0aW9uID0gZnJvbVJvdGF0aW9uO1xuZXhwb3J0cy5mcm9tTWF0NCA9IGZyb21NYXQ0O1xuZXhwb3J0cy5jb3B5ID0gY29weTtcbmV4cG9ydHMuaWRlbnRpdHkgPSBpZGVudGl0eTtcbmV4cG9ydHMuc2V0ID0gc2V0O1xuZXhwb3J0cy5nZXREdWFsID0gZ2V0RHVhbDtcbmV4cG9ydHMuc2V0RHVhbCA9IHNldER1YWw7XG5leHBvcnRzLmdldFRyYW5zbGF0aW9uID0gZ2V0VHJhbnNsYXRpb247XG5leHBvcnRzLnRyYW5zbGF0ZSA9IHRyYW5zbGF0ZTtcbmV4cG9ydHMucm90YXRlWCA9IHJvdGF0ZVg7XG5leHBvcnRzLnJvdGF0ZVkgPSByb3RhdGVZO1xuZXhwb3J0cy5yb3RhdGVaID0gcm90YXRlWjtcbmV4cG9ydHMucm90YXRlQnlRdWF0QXBwZW5kID0gcm90YXRlQnlRdWF0QXBwZW5kO1xuZXhwb3J0cy5yb3RhdGVCeVF1YXRQcmVwZW5kID0gcm90YXRlQnlRdWF0UHJlcGVuZDtcbmV4cG9ydHMucm90YXRlQXJvdW5kQXhpcyA9IHJvdGF0ZUFyb3VuZEF4aXM7XG5leHBvcnRzLmFkZCA9IGFkZDtcbmV4cG9ydHMubXVsdGlwbHkgPSBtdWx0aXBseTtcbmV4cG9ydHMuc2NhbGUgPSBzY2FsZTtcbmV4cG9ydHMubGVycCA9IGxlcnA7XG5leHBvcnRzLmludmVydCA9IGludmVydDtcbmV4cG9ydHMuY29uanVnYXRlID0gY29uanVnYXRlO1xuZXhwb3J0cy5ub3JtYWxpemUgPSBub3JtYWxpemU7XG5leHBvcnRzLnN0ciA9IHN0cjtcbmV4cG9ydHMuZXhhY3RFcXVhbHMgPSBleGFjdEVxdWFscztcbmV4cG9ydHMuZXF1YWxzID0gZXF1YWxzO1xuZXhwb3J0cy5zcXJMZW4gPSBleHBvcnRzLnNxdWFyZWRMZW5ndGggPSBleHBvcnRzLmxlbiA9IGV4cG9ydHMubGVuZ3RoID0gZXhwb3J0cy5kb3QgPSBleHBvcnRzLm11bCA9IGV4cG9ydHMuc2V0UmVhbCA9IGV4cG9ydHMuZ2V0UmVhbCA9IHZvaWQgMDtcblxudmFyIGdsTWF0cml4ID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQocmVxdWlyZShcIi4vY29tbW9uLmpzXCIpKTtcblxudmFyIHF1YXQgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChyZXF1aXJlKFwiLi9xdWF0LmpzXCIpKTtcblxudmFyIG1hdDQgPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChyZXF1aXJlKFwiLi9tYXQ0LmpzXCIpKTtcblxuZnVuY3Rpb24gX2dldFJlcXVpcmVXaWxkY2FyZENhY2hlKCkgeyBpZiAodHlwZW9mIFdlYWtNYXAgIT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIG51bGw7IHZhciBjYWNoZSA9IG5ldyBXZWFrTWFwKCk7IF9nZXRSZXF1aXJlV2lsZGNhcmRDYWNoZSA9IGZ1bmN0aW9uIF9nZXRSZXF1aXJlV2lsZGNhcmRDYWNoZSgpIHsgcmV0dXJuIGNhY2hlOyB9OyByZXR1cm4gY2FjaGU7IH1cblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQob2JqKSB7IGlmIChvYmogJiYgb2JqLl9fZXNNb2R1bGUpIHsgcmV0dXJuIG9iajsgfSBpZiAob2JqID09PSBudWxsIHx8IF90eXBlb2Yob2JqKSAhPT0gXCJvYmplY3RcIiAmJiB0eXBlb2Ygb2JqICE9PSBcImZ1bmN0aW9uXCIpIHsgcmV0dXJuIHsgXCJkZWZhdWx0XCI6IG9iaiB9OyB9IHZhciBjYWNoZSA9IF9nZXRSZXF1aXJlV2lsZGNhcmRDYWNoZSgpOyBpZiAoY2FjaGUgJiYgY2FjaGUuaGFzKG9iaikpIHsgcmV0dXJuIGNhY2hlLmdldChvYmopOyB9IHZhciBuZXdPYmogPSB7fTsgdmFyIGhhc1Byb3BlcnR5RGVzY3JpcHRvciA9IE9iamVjdC5kZWZpbmVQcm9wZXJ0eSAmJiBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yOyBmb3IgKHZhciBrZXkgaW4gb2JqKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpKSB7IHZhciBkZXNjID0gaGFzUHJvcGVydHlEZXNjcmlwdG9yID8gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmosIGtleSkgOiBudWxsOyBpZiAoZGVzYyAmJiAoZGVzYy5nZXQgfHwgZGVzYy5zZXQpKSB7IE9iamVjdC5kZWZpbmVQcm9wZXJ0eShuZXdPYmosIGtleSwgZGVzYyk7IH0gZWxzZSB7IG5ld09ialtrZXldID0gb2JqW2tleV07IH0gfSB9IG5ld09ialtcImRlZmF1bHRcIl0gPSBvYmo7IGlmIChjYWNoZSkgeyBjYWNoZS5zZXQob2JqLCBuZXdPYmopOyB9IHJldHVybiBuZXdPYmo7IH1cblxuLyoqXHJcbiAqIER1YWwgUXVhdGVybmlvbjxicj5cclxuICogRm9ybWF0OiBbcmVhbCwgZHVhbF08YnI+XHJcbiAqIFF1YXRlcm5pb24gZm9ybWF0OiBYWVpXPGJyPlxyXG4gKiBNYWtlIHN1cmUgdG8gaGF2ZSBub3JtYWxpemVkIGR1YWwgcXVhdGVybmlvbnMsIG90aGVyd2lzZSB0aGUgZnVuY3Rpb25zIG1heSBub3Qgd29yayBhcyBpbnRlbmRlZC48YnI+XHJcbiAqIEBtb2R1bGUgcXVhdDJcclxuICovXG5cbi8qKlxyXG4gKiBDcmVhdGVzIGEgbmV3IGlkZW50aXR5IGR1YWwgcXVhdFxyXG4gKlxyXG4gKiBAcmV0dXJucyB7cXVhdDJ9IGEgbmV3IGR1YWwgcXVhdGVybmlvbiBbcmVhbCAtPiByb3RhdGlvbiwgZHVhbCAtPiB0cmFuc2xhdGlvbl1cclxuICovXG5mdW5jdGlvbiBjcmVhdGUoKSB7XG4gIHZhciBkcSA9IG5ldyBnbE1hdHJpeC5BUlJBWV9UWVBFKDgpO1xuXG4gIGlmIChnbE1hdHJpeC5BUlJBWV9UWVBFICE9IEZsb2F0MzJBcnJheSkge1xuICAgIGRxWzBdID0gMDtcbiAgICBkcVsxXSA9IDA7XG4gICAgZHFbMl0gPSAwO1xuICAgIGRxWzRdID0gMDtcbiAgICBkcVs1XSA9IDA7XG4gICAgZHFbNl0gPSAwO1xuICAgIGRxWzddID0gMDtcbiAgfVxuXG4gIGRxWzNdID0gMTtcbiAgcmV0dXJuIGRxO1xufVxuLyoqXHJcbiAqIENyZWF0ZXMgYSBuZXcgcXVhdCBpbml0aWFsaXplZCB3aXRoIHZhbHVlcyBmcm9tIGFuIGV4aXN0aW5nIHF1YXRlcm5pb25cclxuICpcclxuICogQHBhcmFtIHtxdWF0Mn0gYSBkdWFsIHF1YXRlcm5pb24gdG8gY2xvbmVcclxuICogQHJldHVybnMge3F1YXQyfSBuZXcgZHVhbCBxdWF0ZXJuaW9uXHJcbiAqIEBmdW5jdGlvblxyXG4gKi9cblxuXG5mdW5jdGlvbiBjbG9uZShhKSB7XG4gIHZhciBkcSA9IG5ldyBnbE1hdHJpeC5BUlJBWV9UWVBFKDgpO1xuICBkcVswXSA9IGFbMF07XG4gIGRxWzFdID0gYVsxXTtcbiAgZHFbMl0gPSBhWzJdO1xuICBkcVszXSA9IGFbM107XG4gIGRxWzRdID0gYVs0XTtcbiAgZHFbNV0gPSBhWzVdO1xuICBkcVs2XSA9IGFbNl07XG4gIGRxWzddID0gYVs3XTtcbiAgcmV0dXJuIGRxO1xufVxuLyoqXHJcbiAqIENyZWF0ZXMgYSBuZXcgZHVhbCBxdWF0IGluaXRpYWxpemVkIHdpdGggdGhlIGdpdmVuIHZhbHVlc1xyXG4gKlxyXG4gKiBAcGFyYW0ge051bWJlcn0geDEgWCBjb21wb25lbnRcclxuICogQHBhcmFtIHtOdW1iZXJ9IHkxIFkgY29tcG9uZW50XHJcbiAqIEBwYXJhbSB7TnVtYmVyfSB6MSBaIGNvbXBvbmVudFxyXG4gKiBAcGFyYW0ge051bWJlcn0gdzEgVyBjb21wb25lbnRcclxuICogQHBhcmFtIHtOdW1iZXJ9IHgyIFggY29tcG9uZW50XHJcbiAqIEBwYXJhbSB7TnVtYmVyfSB5MiBZIGNvbXBvbmVudFxyXG4gKiBAcGFyYW0ge051bWJlcn0gejIgWiBjb21wb25lbnRcclxuICogQHBhcmFtIHtOdW1iZXJ9IHcyIFcgY29tcG9uZW50XHJcbiAqIEByZXR1cm5zIHtxdWF0Mn0gbmV3IGR1YWwgcXVhdGVybmlvblxyXG4gKiBAZnVuY3Rpb25cclxuICovXG5cblxuZnVuY3Rpb24gZnJvbVZhbHVlcyh4MSwgeTEsIHoxLCB3MSwgeDIsIHkyLCB6MiwgdzIpIHtcbiAgdmFyIGRxID0gbmV3IGdsTWF0cml4LkFSUkFZX1RZUEUoOCk7XG4gIGRxWzBdID0geDE7XG4gIGRxWzFdID0geTE7XG4gIGRxWzJdID0gejE7XG4gIGRxWzNdID0gdzE7XG4gIGRxWzRdID0geDI7XG4gIGRxWzVdID0geTI7XG4gIGRxWzZdID0gejI7XG4gIGRxWzddID0gdzI7XG4gIHJldHVybiBkcTtcbn1cbi8qKlxyXG4gKiBDcmVhdGVzIGEgbmV3IGR1YWwgcXVhdCBmcm9tIHRoZSBnaXZlbiB2YWx1ZXMgKHF1YXQgYW5kIHRyYW5zbGF0aW9uKVxyXG4gKlxyXG4gKiBAcGFyYW0ge051bWJlcn0geDEgWCBjb21wb25lbnRcclxuICogQHBhcmFtIHtOdW1iZXJ9IHkxIFkgY29tcG9uZW50XHJcbiAqIEBwYXJhbSB7TnVtYmVyfSB6MSBaIGNvbXBvbmVudFxyXG4gKiBAcGFyYW0ge051bWJlcn0gdzEgVyBjb21wb25lbnRcclxuICogQHBhcmFtIHtOdW1iZXJ9IHgyIFggY29tcG9uZW50ICh0cmFuc2xhdGlvbilcclxuICogQHBhcmFtIHtOdW1iZXJ9IHkyIFkgY29tcG9uZW50ICh0cmFuc2xhdGlvbilcclxuICogQHBhcmFtIHtOdW1iZXJ9IHoyIFogY29tcG9uZW50ICh0cmFuc2xhdGlvbilcclxuICogQHJldHVybnMge3F1YXQyfSBuZXcgZHVhbCBxdWF0ZXJuaW9uXHJcbiAqIEBmdW5jdGlvblxyXG4gKi9cblxuXG5mdW5jdGlvbiBmcm9tUm90YXRpb25UcmFuc2xhdGlvblZhbHVlcyh4MSwgeTEsIHoxLCB3MSwgeDIsIHkyLCB6Mikge1xuICB2YXIgZHEgPSBuZXcgZ2xNYXRyaXguQVJSQVlfVFlQRSg4KTtcbiAgZHFbMF0gPSB4MTtcbiAgZHFbMV0gPSB5MTtcbiAgZHFbMl0gPSB6MTtcbiAgZHFbM10gPSB3MTtcbiAgdmFyIGF4ID0geDIgKiAwLjUsXG4gICAgICBheSA9IHkyICogMC41LFxuICAgICAgYXogPSB6MiAqIDAuNTtcbiAgZHFbNF0gPSBheCAqIHcxICsgYXkgKiB6MSAtIGF6ICogeTE7XG4gIGRxWzVdID0gYXkgKiB3MSArIGF6ICogeDEgLSBheCAqIHoxO1xuICBkcVs2XSA9IGF6ICogdzEgKyBheCAqIHkxIC0gYXkgKiB4MTtcbiAgZHFbN10gPSAtYXggKiB4MSAtIGF5ICogeTEgLSBheiAqIHoxO1xuICByZXR1cm4gZHE7XG59XG4vKipcclxuICogQ3JlYXRlcyBhIGR1YWwgcXVhdCBmcm9tIGEgcXVhdGVybmlvbiBhbmQgYSB0cmFuc2xhdGlvblxyXG4gKlxyXG4gKiBAcGFyYW0ge3F1YXQyfSBkdWFsIHF1YXRlcm5pb24gcmVjZWl2aW5nIG9wZXJhdGlvbiByZXN1bHRcclxuICogQHBhcmFtIHtxdWF0fSBxIGEgbm9ybWFsaXplZCBxdWF0ZXJuaW9uXHJcbiAqIEBwYXJhbSB7dmVjM30gdCB0cmFubGF0aW9uIHZlY3RvclxyXG4gKiBAcmV0dXJucyB7cXVhdDJ9IGR1YWwgcXVhdGVybmlvbiByZWNlaXZpbmcgb3BlcmF0aW9uIHJlc3VsdFxyXG4gKiBAZnVuY3Rpb25cclxuICovXG5cblxuZnVuY3Rpb24gZnJvbVJvdGF0aW9uVHJhbnNsYXRpb24ob3V0LCBxLCB0KSB7XG4gIHZhciBheCA9IHRbMF0gKiAwLjUsXG4gICAgICBheSA9IHRbMV0gKiAwLjUsXG4gICAgICBheiA9IHRbMl0gKiAwLjUsXG4gICAgICBieCA9IHFbMF0sXG4gICAgICBieSA9IHFbMV0sXG4gICAgICBieiA9IHFbMl0sXG4gICAgICBidyA9IHFbM107XG4gIG91dFswXSA9IGJ4O1xuICBvdXRbMV0gPSBieTtcbiAgb3V0WzJdID0gYno7XG4gIG91dFszXSA9IGJ3O1xuICBvdXRbNF0gPSBheCAqIGJ3ICsgYXkgKiBieiAtIGF6ICogYnk7XG4gIG91dFs1XSA9IGF5ICogYncgKyBheiAqIGJ4IC0gYXggKiBiejtcbiAgb3V0WzZdID0gYXogKiBidyArIGF4ICogYnkgLSBheSAqIGJ4O1xuICBvdXRbN10gPSAtYXggKiBieCAtIGF5ICogYnkgLSBheiAqIGJ6O1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIENyZWF0ZXMgYSBkdWFsIHF1YXQgZnJvbSBhIHRyYW5zbGF0aW9uXHJcbiAqXHJcbiAqIEBwYXJhbSB7cXVhdDJ9IGR1YWwgcXVhdGVybmlvbiByZWNlaXZpbmcgb3BlcmF0aW9uIHJlc3VsdFxyXG4gKiBAcGFyYW0ge3ZlYzN9IHQgdHJhbnNsYXRpb24gdmVjdG9yXHJcbiAqIEByZXR1cm5zIHtxdWF0Mn0gZHVhbCBxdWF0ZXJuaW9uIHJlY2VpdmluZyBvcGVyYXRpb24gcmVzdWx0XHJcbiAqIEBmdW5jdGlvblxyXG4gKi9cblxuXG5mdW5jdGlvbiBmcm9tVHJhbnNsYXRpb24ob3V0LCB0KSB7XG4gIG91dFswXSA9IDA7XG4gIG91dFsxXSA9IDA7XG4gIG91dFsyXSA9IDA7XG4gIG91dFszXSA9IDE7XG4gIG91dFs0XSA9IHRbMF0gKiAwLjU7XG4gIG91dFs1XSA9IHRbMV0gKiAwLjU7XG4gIG91dFs2XSA9IHRbMl0gKiAwLjU7XG4gIG91dFs3XSA9IDA7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogQ3JlYXRlcyBhIGR1YWwgcXVhdCBmcm9tIGEgcXVhdGVybmlvblxyXG4gKlxyXG4gKiBAcGFyYW0ge3F1YXQyfSBkdWFsIHF1YXRlcm5pb24gcmVjZWl2aW5nIG9wZXJhdGlvbiByZXN1bHRcclxuICogQHBhcmFtIHtxdWF0fSBxIHRoZSBxdWF0ZXJuaW9uXHJcbiAqIEByZXR1cm5zIHtxdWF0Mn0gZHVhbCBxdWF0ZXJuaW9uIHJlY2VpdmluZyBvcGVyYXRpb24gcmVzdWx0XHJcbiAqIEBmdW5jdGlvblxyXG4gKi9cblxuXG5mdW5jdGlvbiBmcm9tUm90YXRpb24ob3V0LCBxKSB7XG4gIG91dFswXSA9IHFbMF07XG4gIG91dFsxXSA9IHFbMV07XG4gIG91dFsyXSA9IHFbMl07XG4gIG91dFszXSA9IHFbM107XG4gIG91dFs0XSA9IDA7XG4gIG91dFs1XSA9IDA7XG4gIG91dFs2XSA9IDA7XG4gIG91dFs3XSA9IDA7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogQ3JlYXRlcyBhIG5ldyBkdWFsIHF1YXQgZnJvbSBhIG1hdHJpeCAoNHg0KVxyXG4gKlxyXG4gKiBAcGFyYW0ge3F1YXQyfSBvdXQgdGhlIGR1YWwgcXVhdGVybmlvblxyXG4gKiBAcGFyYW0ge21hdDR9IGEgdGhlIG1hdHJpeFxyXG4gKiBAcmV0dXJucyB7cXVhdDJ9IGR1YWwgcXVhdCByZWNlaXZpbmcgb3BlcmF0aW9uIHJlc3VsdFxyXG4gKiBAZnVuY3Rpb25cclxuICovXG5cblxuZnVuY3Rpb24gZnJvbU1hdDQob3V0LCBhKSB7XG4gIC8vVE9ETyBPcHRpbWl6ZSB0aGlzXG4gIHZhciBvdXRlciA9IHF1YXQuY3JlYXRlKCk7XG4gIG1hdDQuZ2V0Um90YXRpb24ob3V0ZXIsIGEpO1xuICB2YXIgdCA9IG5ldyBnbE1hdHJpeC5BUlJBWV9UWVBFKDMpO1xuICBtYXQ0LmdldFRyYW5zbGF0aW9uKHQsIGEpO1xuICBmcm9tUm90YXRpb25UcmFuc2xhdGlvbihvdXQsIG91dGVyLCB0KTtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBDb3B5IHRoZSB2YWx1ZXMgZnJvbSBvbmUgZHVhbCBxdWF0IHRvIGFub3RoZXJcclxuICpcclxuICogQHBhcmFtIHtxdWF0Mn0gb3V0IHRoZSByZWNlaXZpbmcgZHVhbCBxdWF0ZXJuaW9uXHJcbiAqIEBwYXJhbSB7cXVhdDJ9IGEgdGhlIHNvdXJjZSBkdWFsIHF1YXRlcm5pb25cclxuICogQHJldHVybnMge3F1YXQyfSBvdXRcclxuICogQGZ1bmN0aW9uXHJcbiAqL1xuXG5cbmZ1bmN0aW9uIGNvcHkob3V0LCBhKSB7XG4gIG91dFswXSA9IGFbMF07XG4gIG91dFsxXSA9IGFbMV07XG4gIG91dFsyXSA9IGFbMl07XG4gIG91dFszXSA9IGFbM107XG4gIG91dFs0XSA9IGFbNF07XG4gIG91dFs1XSA9IGFbNV07XG4gIG91dFs2XSA9IGFbNl07XG4gIG91dFs3XSA9IGFbN107XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogU2V0IGEgZHVhbCBxdWF0IHRvIHRoZSBpZGVudGl0eSBkdWFsIHF1YXRlcm5pb25cclxuICpcclxuICogQHBhcmFtIHtxdWF0Mn0gb3V0IHRoZSByZWNlaXZpbmcgcXVhdGVybmlvblxyXG4gKiBAcmV0dXJucyB7cXVhdDJ9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBpZGVudGl0eShvdXQpIHtcbiAgb3V0WzBdID0gMDtcbiAgb3V0WzFdID0gMDtcbiAgb3V0WzJdID0gMDtcbiAgb3V0WzNdID0gMTtcbiAgb3V0WzRdID0gMDtcbiAgb3V0WzVdID0gMDtcbiAgb3V0WzZdID0gMDtcbiAgb3V0WzddID0gMDtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBTZXQgdGhlIGNvbXBvbmVudHMgb2YgYSBkdWFsIHF1YXQgdG8gdGhlIGdpdmVuIHZhbHVlc1xyXG4gKlxyXG4gKiBAcGFyYW0ge3F1YXQyfSBvdXQgdGhlIHJlY2VpdmluZyBxdWF0ZXJuaW9uXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSB4MSBYIGNvbXBvbmVudFxyXG4gKiBAcGFyYW0ge051bWJlcn0geTEgWSBjb21wb25lbnRcclxuICogQHBhcmFtIHtOdW1iZXJ9IHoxIFogY29tcG9uZW50XHJcbiAqIEBwYXJhbSB7TnVtYmVyfSB3MSBXIGNvbXBvbmVudFxyXG4gKiBAcGFyYW0ge051bWJlcn0geDIgWCBjb21wb25lbnRcclxuICogQHBhcmFtIHtOdW1iZXJ9IHkyIFkgY29tcG9uZW50XHJcbiAqIEBwYXJhbSB7TnVtYmVyfSB6MiBaIGNvbXBvbmVudFxyXG4gKiBAcGFyYW0ge051bWJlcn0gdzIgVyBjb21wb25lbnRcclxuICogQHJldHVybnMge3F1YXQyfSBvdXRcclxuICogQGZ1bmN0aW9uXHJcbiAqL1xuXG5cbmZ1bmN0aW9uIHNldChvdXQsIHgxLCB5MSwgejEsIHcxLCB4MiwgeTIsIHoyLCB3Mikge1xuICBvdXRbMF0gPSB4MTtcbiAgb3V0WzFdID0geTE7XG4gIG91dFsyXSA9IHoxO1xuICBvdXRbM10gPSB3MTtcbiAgb3V0WzRdID0geDI7XG4gIG91dFs1XSA9IHkyO1xuICBvdXRbNl0gPSB6MjtcbiAgb3V0WzddID0gdzI7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogR2V0cyB0aGUgcmVhbCBwYXJ0IG9mIGEgZHVhbCBxdWF0XHJcbiAqIEBwYXJhbSAge3F1YXR9IG91dCByZWFsIHBhcnRcclxuICogQHBhcmFtICB7cXVhdDJ9IGEgRHVhbCBRdWF0ZXJuaW9uXHJcbiAqIEByZXR1cm4ge3F1YXR9IHJlYWwgcGFydFxyXG4gKi9cblxuXG52YXIgZ2V0UmVhbCA9IHF1YXQuY29weTtcbi8qKlxyXG4gKiBHZXRzIHRoZSBkdWFsIHBhcnQgb2YgYSBkdWFsIHF1YXRcclxuICogQHBhcmFtICB7cXVhdH0gb3V0IGR1YWwgcGFydFxyXG4gKiBAcGFyYW0gIHtxdWF0Mn0gYSBEdWFsIFF1YXRlcm5pb25cclxuICogQHJldHVybiB7cXVhdH0gZHVhbCBwYXJ0XHJcbiAqL1xuXG5leHBvcnRzLmdldFJlYWwgPSBnZXRSZWFsO1xuXG5mdW5jdGlvbiBnZXREdWFsKG91dCwgYSkge1xuICBvdXRbMF0gPSBhWzRdO1xuICBvdXRbMV0gPSBhWzVdO1xuICBvdXRbMl0gPSBhWzZdO1xuICBvdXRbM10gPSBhWzddO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIFNldCB0aGUgcmVhbCBjb21wb25lbnQgb2YgYSBkdWFsIHF1YXQgdG8gdGhlIGdpdmVuIHF1YXRlcm5pb25cclxuICpcclxuICogQHBhcmFtIHtxdWF0Mn0gb3V0IHRoZSByZWNlaXZpbmcgcXVhdGVybmlvblxyXG4gKiBAcGFyYW0ge3F1YXR9IHEgYSBxdWF0ZXJuaW9uIHJlcHJlc2VudGluZyB0aGUgcmVhbCBwYXJ0XHJcbiAqIEByZXR1cm5zIHtxdWF0Mn0gb3V0XHJcbiAqIEBmdW5jdGlvblxyXG4gKi9cblxuXG52YXIgc2V0UmVhbCA9IHF1YXQuY29weTtcbi8qKlxyXG4gKiBTZXQgdGhlIGR1YWwgY29tcG9uZW50IG9mIGEgZHVhbCBxdWF0IHRvIHRoZSBnaXZlbiBxdWF0ZXJuaW9uXHJcbiAqXHJcbiAqIEBwYXJhbSB7cXVhdDJ9IG91dCB0aGUgcmVjZWl2aW5nIHF1YXRlcm5pb25cclxuICogQHBhcmFtIHtxdWF0fSBxIGEgcXVhdGVybmlvbiByZXByZXNlbnRpbmcgdGhlIGR1YWwgcGFydFxyXG4gKiBAcmV0dXJucyB7cXVhdDJ9IG91dFxyXG4gKiBAZnVuY3Rpb25cclxuICovXG5cbmV4cG9ydHMuc2V0UmVhbCA9IHNldFJlYWw7XG5cbmZ1bmN0aW9uIHNldER1YWwob3V0LCBxKSB7XG4gIG91dFs0XSA9IHFbMF07XG4gIG91dFs1XSA9IHFbMV07XG4gIG91dFs2XSA9IHFbMl07XG4gIG91dFs3XSA9IHFbM107XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogR2V0cyB0aGUgdHJhbnNsYXRpb24gb2YgYSBub3JtYWxpemVkIGR1YWwgcXVhdFxyXG4gKiBAcGFyYW0gIHt2ZWMzfSBvdXQgdHJhbnNsYXRpb25cclxuICogQHBhcmFtICB7cXVhdDJ9IGEgRHVhbCBRdWF0ZXJuaW9uIHRvIGJlIGRlY29tcG9zZWRcclxuICogQHJldHVybiB7dmVjM30gdHJhbnNsYXRpb25cclxuICovXG5cblxuZnVuY3Rpb24gZ2V0VHJhbnNsYXRpb24ob3V0LCBhKSB7XG4gIHZhciBheCA9IGFbNF0sXG4gICAgICBheSA9IGFbNV0sXG4gICAgICBheiA9IGFbNl0sXG4gICAgICBhdyA9IGFbN10sXG4gICAgICBieCA9IC1hWzBdLFxuICAgICAgYnkgPSAtYVsxXSxcbiAgICAgIGJ6ID0gLWFbMl0sXG4gICAgICBidyA9IGFbM107XG4gIG91dFswXSA9IChheCAqIGJ3ICsgYXcgKiBieCArIGF5ICogYnogLSBheiAqIGJ5KSAqIDI7XG4gIG91dFsxXSA9IChheSAqIGJ3ICsgYXcgKiBieSArIGF6ICogYnggLSBheCAqIGJ6KSAqIDI7XG4gIG91dFsyXSA9IChheiAqIGJ3ICsgYXcgKiBieiArIGF4ICogYnkgLSBheSAqIGJ4KSAqIDI7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogVHJhbnNsYXRlcyBhIGR1YWwgcXVhdCBieSB0aGUgZ2l2ZW4gdmVjdG9yXHJcbiAqXHJcbiAqIEBwYXJhbSB7cXVhdDJ9IG91dCB0aGUgcmVjZWl2aW5nIGR1YWwgcXVhdGVybmlvblxyXG4gKiBAcGFyYW0ge3F1YXQyfSBhIHRoZSBkdWFsIHF1YXRlcm5pb24gdG8gdHJhbnNsYXRlXHJcbiAqIEBwYXJhbSB7dmVjM30gdiB2ZWN0b3IgdG8gdHJhbnNsYXRlIGJ5XHJcbiAqIEByZXR1cm5zIHtxdWF0Mn0gb3V0XHJcbiAqL1xuXG5cbmZ1bmN0aW9uIHRyYW5zbGF0ZShvdXQsIGEsIHYpIHtcbiAgdmFyIGF4MSA9IGFbMF0sXG4gICAgICBheTEgPSBhWzFdLFxuICAgICAgYXoxID0gYVsyXSxcbiAgICAgIGF3MSA9IGFbM10sXG4gICAgICBieDEgPSB2WzBdICogMC41LFxuICAgICAgYnkxID0gdlsxXSAqIDAuNSxcbiAgICAgIGJ6MSA9IHZbMl0gKiAwLjUsXG4gICAgICBheDIgPSBhWzRdLFxuICAgICAgYXkyID0gYVs1XSxcbiAgICAgIGF6MiA9IGFbNl0sXG4gICAgICBhdzIgPSBhWzddO1xuICBvdXRbMF0gPSBheDE7XG4gIG91dFsxXSA9IGF5MTtcbiAgb3V0WzJdID0gYXoxO1xuICBvdXRbM10gPSBhdzE7XG4gIG91dFs0XSA9IGF3MSAqIGJ4MSArIGF5MSAqIGJ6MSAtIGF6MSAqIGJ5MSArIGF4MjtcbiAgb3V0WzVdID0gYXcxICogYnkxICsgYXoxICogYngxIC0gYXgxICogYnoxICsgYXkyO1xuICBvdXRbNl0gPSBhdzEgKiBiejEgKyBheDEgKiBieTEgLSBheTEgKiBieDEgKyBhejI7XG4gIG91dFs3XSA9IC1heDEgKiBieDEgLSBheTEgKiBieTEgLSBhejEgKiBiejEgKyBhdzI7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogUm90YXRlcyBhIGR1YWwgcXVhdCBhcm91bmQgdGhlIFggYXhpc1xyXG4gKlxyXG4gKiBAcGFyYW0ge3F1YXQyfSBvdXQgdGhlIHJlY2VpdmluZyBkdWFsIHF1YXRlcm5pb25cclxuICogQHBhcmFtIHtxdWF0Mn0gYSB0aGUgZHVhbCBxdWF0ZXJuaW9uIHRvIHJvdGF0ZVxyXG4gKiBAcGFyYW0ge251bWJlcn0gcmFkIGhvdyBmYXIgc2hvdWxkIHRoZSByb3RhdGlvbiBiZVxyXG4gKiBAcmV0dXJucyB7cXVhdDJ9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiByb3RhdGVYKG91dCwgYSwgcmFkKSB7XG4gIHZhciBieCA9IC1hWzBdLFxuICAgICAgYnkgPSAtYVsxXSxcbiAgICAgIGJ6ID0gLWFbMl0sXG4gICAgICBidyA9IGFbM10sXG4gICAgICBheCA9IGFbNF0sXG4gICAgICBheSA9IGFbNV0sXG4gICAgICBheiA9IGFbNl0sXG4gICAgICBhdyA9IGFbN10sXG4gICAgICBheDEgPSBheCAqIGJ3ICsgYXcgKiBieCArIGF5ICogYnogLSBheiAqIGJ5LFxuICAgICAgYXkxID0gYXkgKiBidyArIGF3ICogYnkgKyBheiAqIGJ4IC0gYXggKiBieixcbiAgICAgIGF6MSA9IGF6ICogYncgKyBhdyAqIGJ6ICsgYXggKiBieSAtIGF5ICogYngsXG4gICAgICBhdzEgPSBhdyAqIGJ3IC0gYXggKiBieCAtIGF5ICogYnkgLSBheiAqIGJ6O1xuICBxdWF0LnJvdGF0ZVgob3V0LCBhLCByYWQpO1xuICBieCA9IG91dFswXTtcbiAgYnkgPSBvdXRbMV07XG4gIGJ6ID0gb3V0WzJdO1xuICBidyA9IG91dFszXTtcbiAgb3V0WzRdID0gYXgxICogYncgKyBhdzEgKiBieCArIGF5MSAqIGJ6IC0gYXoxICogYnk7XG4gIG91dFs1XSA9IGF5MSAqIGJ3ICsgYXcxICogYnkgKyBhejEgKiBieCAtIGF4MSAqIGJ6O1xuICBvdXRbNl0gPSBhejEgKiBidyArIGF3MSAqIGJ6ICsgYXgxICogYnkgLSBheTEgKiBieDtcbiAgb3V0WzddID0gYXcxICogYncgLSBheDEgKiBieCAtIGF5MSAqIGJ5IC0gYXoxICogYno7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogUm90YXRlcyBhIGR1YWwgcXVhdCBhcm91bmQgdGhlIFkgYXhpc1xyXG4gKlxyXG4gKiBAcGFyYW0ge3F1YXQyfSBvdXQgdGhlIHJlY2VpdmluZyBkdWFsIHF1YXRlcm5pb25cclxuICogQHBhcmFtIHtxdWF0Mn0gYSB0aGUgZHVhbCBxdWF0ZXJuaW9uIHRvIHJvdGF0ZVxyXG4gKiBAcGFyYW0ge251bWJlcn0gcmFkIGhvdyBmYXIgc2hvdWxkIHRoZSByb3RhdGlvbiBiZVxyXG4gKiBAcmV0dXJucyB7cXVhdDJ9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiByb3RhdGVZKG91dCwgYSwgcmFkKSB7XG4gIHZhciBieCA9IC1hWzBdLFxuICAgICAgYnkgPSAtYVsxXSxcbiAgICAgIGJ6ID0gLWFbMl0sXG4gICAgICBidyA9IGFbM10sXG4gICAgICBheCA9IGFbNF0sXG4gICAgICBheSA9IGFbNV0sXG4gICAgICBheiA9IGFbNl0sXG4gICAgICBhdyA9IGFbN10sXG4gICAgICBheDEgPSBheCAqIGJ3ICsgYXcgKiBieCArIGF5ICogYnogLSBheiAqIGJ5LFxuICAgICAgYXkxID0gYXkgKiBidyArIGF3ICogYnkgKyBheiAqIGJ4IC0gYXggKiBieixcbiAgICAgIGF6MSA9IGF6ICogYncgKyBhdyAqIGJ6ICsgYXggKiBieSAtIGF5ICogYngsXG4gICAgICBhdzEgPSBhdyAqIGJ3IC0gYXggKiBieCAtIGF5ICogYnkgLSBheiAqIGJ6O1xuICBxdWF0LnJvdGF0ZVkob3V0LCBhLCByYWQpO1xuICBieCA9IG91dFswXTtcbiAgYnkgPSBvdXRbMV07XG4gIGJ6ID0gb3V0WzJdO1xuICBidyA9IG91dFszXTtcbiAgb3V0WzRdID0gYXgxICogYncgKyBhdzEgKiBieCArIGF5MSAqIGJ6IC0gYXoxICogYnk7XG4gIG91dFs1XSA9IGF5MSAqIGJ3ICsgYXcxICogYnkgKyBhejEgKiBieCAtIGF4MSAqIGJ6O1xuICBvdXRbNl0gPSBhejEgKiBidyArIGF3MSAqIGJ6ICsgYXgxICogYnkgLSBheTEgKiBieDtcbiAgb3V0WzddID0gYXcxICogYncgLSBheDEgKiBieCAtIGF5MSAqIGJ5IC0gYXoxICogYno7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogUm90YXRlcyBhIGR1YWwgcXVhdCBhcm91bmQgdGhlIFogYXhpc1xyXG4gKlxyXG4gKiBAcGFyYW0ge3F1YXQyfSBvdXQgdGhlIHJlY2VpdmluZyBkdWFsIHF1YXRlcm5pb25cclxuICogQHBhcmFtIHtxdWF0Mn0gYSB0aGUgZHVhbCBxdWF0ZXJuaW9uIHRvIHJvdGF0ZVxyXG4gKiBAcGFyYW0ge251bWJlcn0gcmFkIGhvdyBmYXIgc2hvdWxkIHRoZSByb3RhdGlvbiBiZVxyXG4gKiBAcmV0dXJucyB7cXVhdDJ9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiByb3RhdGVaKG91dCwgYSwgcmFkKSB7XG4gIHZhciBieCA9IC1hWzBdLFxuICAgICAgYnkgPSAtYVsxXSxcbiAgICAgIGJ6ID0gLWFbMl0sXG4gICAgICBidyA9IGFbM10sXG4gICAgICBheCA9IGFbNF0sXG4gICAgICBheSA9IGFbNV0sXG4gICAgICBheiA9IGFbNl0sXG4gICAgICBhdyA9IGFbN10sXG4gICAgICBheDEgPSBheCAqIGJ3ICsgYXcgKiBieCArIGF5ICogYnogLSBheiAqIGJ5LFxuICAgICAgYXkxID0gYXkgKiBidyArIGF3ICogYnkgKyBheiAqIGJ4IC0gYXggKiBieixcbiAgICAgIGF6MSA9IGF6ICogYncgKyBhdyAqIGJ6ICsgYXggKiBieSAtIGF5ICogYngsXG4gICAgICBhdzEgPSBhdyAqIGJ3IC0gYXggKiBieCAtIGF5ICogYnkgLSBheiAqIGJ6O1xuICBxdWF0LnJvdGF0ZVoob3V0LCBhLCByYWQpO1xuICBieCA9IG91dFswXTtcbiAgYnkgPSBvdXRbMV07XG4gIGJ6ID0gb3V0WzJdO1xuICBidyA9IG91dFszXTtcbiAgb3V0WzRdID0gYXgxICogYncgKyBhdzEgKiBieCArIGF5MSAqIGJ6IC0gYXoxICogYnk7XG4gIG91dFs1XSA9IGF5MSAqIGJ3ICsgYXcxICogYnkgKyBhejEgKiBieCAtIGF4MSAqIGJ6O1xuICBvdXRbNl0gPSBhejEgKiBidyArIGF3MSAqIGJ6ICsgYXgxICogYnkgLSBheTEgKiBieDtcbiAgb3V0WzddID0gYXcxICogYncgLSBheDEgKiBieCAtIGF5MSAqIGJ5IC0gYXoxICogYno7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogUm90YXRlcyBhIGR1YWwgcXVhdCBieSBhIGdpdmVuIHF1YXRlcm5pb24gKGEgKiBxKVxyXG4gKlxyXG4gKiBAcGFyYW0ge3F1YXQyfSBvdXQgdGhlIHJlY2VpdmluZyBkdWFsIHF1YXRlcm5pb25cclxuICogQHBhcmFtIHtxdWF0Mn0gYSB0aGUgZHVhbCBxdWF0ZXJuaW9uIHRvIHJvdGF0ZVxyXG4gKiBAcGFyYW0ge3F1YXR9IHEgcXVhdGVybmlvbiB0byByb3RhdGUgYnlcclxuICogQHJldHVybnMge3F1YXQyfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gcm90YXRlQnlRdWF0QXBwZW5kKG91dCwgYSwgcSkge1xuICB2YXIgcXggPSBxWzBdLFxuICAgICAgcXkgPSBxWzFdLFxuICAgICAgcXogPSBxWzJdLFxuICAgICAgcXcgPSBxWzNdLFxuICAgICAgYXggPSBhWzBdLFxuICAgICAgYXkgPSBhWzFdLFxuICAgICAgYXogPSBhWzJdLFxuICAgICAgYXcgPSBhWzNdO1xuICBvdXRbMF0gPSBheCAqIHF3ICsgYXcgKiBxeCArIGF5ICogcXogLSBheiAqIHF5O1xuICBvdXRbMV0gPSBheSAqIHF3ICsgYXcgKiBxeSArIGF6ICogcXggLSBheCAqIHF6O1xuICBvdXRbMl0gPSBheiAqIHF3ICsgYXcgKiBxeiArIGF4ICogcXkgLSBheSAqIHF4O1xuICBvdXRbM10gPSBhdyAqIHF3IC0gYXggKiBxeCAtIGF5ICogcXkgLSBheiAqIHF6O1xuICBheCA9IGFbNF07XG4gIGF5ID0gYVs1XTtcbiAgYXogPSBhWzZdO1xuICBhdyA9IGFbN107XG4gIG91dFs0XSA9IGF4ICogcXcgKyBhdyAqIHF4ICsgYXkgKiBxeiAtIGF6ICogcXk7XG4gIG91dFs1XSA9IGF5ICogcXcgKyBhdyAqIHF5ICsgYXogKiBxeCAtIGF4ICogcXo7XG4gIG91dFs2XSA9IGF6ICogcXcgKyBhdyAqIHF6ICsgYXggKiBxeSAtIGF5ICogcXg7XG4gIG91dFs3XSA9IGF3ICogcXcgLSBheCAqIHF4IC0gYXkgKiBxeSAtIGF6ICogcXo7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogUm90YXRlcyBhIGR1YWwgcXVhdCBieSBhIGdpdmVuIHF1YXRlcm5pb24gKHEgKiBhKVxyXG4gKlxyXG4gKiBAcGFyYW0ge3F1YXQyfSBvdXQgdGhlIHJlY2VpdmluZyBkdWFsIHF1YXRlcm5pb25cclxuICogQHBhcmFtIHtxdWF0fSBxIHF1YXRlcm5pb24gdG8gcm90YXRlIGJ5XHJcbiAqIEBwYXJhbSB7cXVhdDJ9IGEgdGhlIGR1YWwgcXVhdGVybmlvbiB0byByb3RhdGVcclxuICogQHJldHVybnMge3F1YXQyfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gcm90YXRlQnlRdWF0UHJlcGVuZChvdXQsIHEsIGEpIHtcbiAgdmFyIHF4ID0gcVswXSxcbiAgICAgIHF5ID0gcVsxXSxcbiAgICAgIHF6ID0gcVsyXSxcbiAgICAgIHF3ID0gcVszXSxcbiAgICAgIGJ4ID0gYVswXSxcbiAgICAgIGJ5ID0gYVsxXSxcbiAgICAgIGJ6ID0gYVsyXSxcbiAgICAgIGJ3ID0gYVszXTtcbiAgb3V0WzBdID0gcXggKiBidyArIHF3ICogYnggKyBxeSAqIGJ6IC0gcXogKiBieTtcbiAgb3V0WzFdID0gcXkgKiBidyArIHF3ICogYnkgKyBxeiAqIGJ4IC0gcXggKiBiejtcbiAgb3V0WzJdID0gcXogKiBidyArIHF3ICogYnogKyBxeCAqIGJ5IC0gcXkgKiBieDtcbiAgb3V0WzNdID0gcXcgKiBidyAtIHF4ICogYnggLSBxeSAqIGJ5IC0gcXogKiBiejtcbiAgYnggPSBhWzRdO1xuICBieSA9IGFbNV07XG4gIGJ6ID0gYVs2XTtcbiAgYncgPSBhWzddO1xuICBvdXRbNF0gPSBxeCAqIGJ3ICsgcXcgKiBieCArIHF5ICogYnogLSBxeiAqIGJ5O1xuICBvdXRbNV0gPSBxeSAqIGJ3ICsgcXcgKiBieSArIHF6ICogYnggLSBxeCAqIGJ6O1xuICBvdXRbNl0gPSBxeiAqIGJ3ICsgcXcgKiBieiArIHF4ICogYnkgLSBxeSAqIGJ4O1xuICBvdXRbN10gPSBxdyAqIGJ3IC0gcXggKiBieCAtIHF5ICogYnkgLSBxeiAqIGJ6O1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIFJvdGF0ZXMgYSBkdWFsIHF1YXQgYXJvdW5kIGEgZ2l2ZW4gYXhpcy4gRG9lcyB0aGUgbm9ybWFsaXNhdGlvbiBhdXRvbWF0aWNhbGx5XHJcbiAqXHJcbiAqIEBwYXJhbSB7cXVhdDJ9IG91dCB0aGUgcmVjZWl2aW5nIGR1YWwgcXVhdGVybmlvblxyXG4gKiBAcGFyYW0ge3F1YXQyfSBhIHRoZSBkdWFsIHF1YXRlcm5pb24gdG8gcm90YXRlXHJcbiAqIEBwYXJhbSB7dmVjM30gYXhpcyB0aGUgYXhpcyB0byByb3RhdGUgYXJvdW5kXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSByYWQgaG93IGZhciB0aGUgcm90YXRpb24gc2hvdWxkIGJlXHJcbiAqIEByZXR1cm5zIHtxdWF0Mn0gb3V0XHJcbiAqL1xuXG5cbmZ1bmN0aW9uIHJvdGF0ZUFyb3VuZEF4aXMob3V0LCBhLCBheGlzLCByYWQpIHtcbiAgLy9TcGVjaWFsIGNhc2UgZm9yIHJhZCA9IDBcbiAgaWYgKE1hdGguYWJzKHJhZCkgPCBnbE1hdHJpeC5FUFNJTE9OKSB7XG4gICAgcmV0dXJuIGNvcHkob3V0LCBhKTtcbiAgfVxuXG4gIHZhciBheGlzTGVuZ3RoID0gTWF0aC5oeXBvdChheGlzWzBdLCBheGlzWzFdLCBheGlzWzJdKTtcbiAgcmFkID0gcmFkICogMC41O1xuICB2YXIgcyA9IE1hdGguc2luKHJhZCk7XG4gIHZhciBieCA9IHMgKiBheGlzWzBdIC8gYXhpc0xlbmd0aDtcbiAgdmFyIGJ5ID0gcyAqIGF4aXNbMV0gLyBheGlzTGVuZ3RoO1xuICB2YXIgYnogPSBzICogYXhpc1syXSAvIGF4aXNMZW5ndGg7XG4gIHZhciBidyA9IE1hdGguY29zKHJhZCk7XG4gIHZhciBheDEgPSBhWzBdLFxuICAgICAgYXkxID0gYVsxXSxcbiAgICAgIGF6MSA9IGFbMl0sXG4gICAgICBhdzEgPSBhWzNdO1xuICBvdXRbMF0gPSBheDEgKiBidyArIGF3MSAqIGJ4ICsgYXkxICogYnogLSBhejEgKiBieTtcbiAgb3V0WzFdID0gYXkxICogYncgKyBhdzEgKiBieSArIGF6MSAqIGJ4IC0gYXgxICogYno7XG4gIG91dFsyXSA9IGF6MSAqIGJ3ICsgYXcxICogYnogKyBheDEgKiBieSAtIGF5MSAqIGJ4O1xuICBvdXRbM10gPSBhdzEgKiBidyAtIGF4MSAqIGJ4IC0gYXkxICogYnkgLSBhejEgKiBiejtcbiAgdmFyIGF4ID0gYVs0XSxcbiAgICAgIGF5ID0gYVs1XSxcbiAgICAgIGF6ID0gYVs2XSxcbiAgICAgIGF3ID0gYVs3XTtcbiAgb3V0WzRdID0gYXggKiBidyArIGF3ICogYnggKyBheSAqIGJ6IC0gYXogKiBieTtcbiAgb3V0WzVdID0gYXkgKiBidyArIGF3ICogYnkgKyBheiAqIGJ4IC0gYXggKiBiejtcbiAgb3V0WzZdID0gYXogKiBidyArIGF3ICogYnogKyBheCAqIGJ5IC0gYXkgKiBieDtcbiAgb3V0WzddID0gYXcgKiBidyAtIGF4ICogYnggLSBheSAqIGJ5IC0gYXogKiBiejtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBBZGRzIHR3byBkdWFsIHF1YXQnc1xyXG4gKlxyXG4gKiBAcGFyYW0ge3F1YXQyfSBvdXQgdGhlIHJlY2VpdmluZyBkdWFsIHF1YXRlcm5pb25cclxuICogQHBhcmFtIHtxdWF0Mn0gYSB0aGUgZmlyc3Qgb3BlcmFuZFxyXG4gKiBAcGFyYW0ge3F1YXQyfSBiIHRoZSBzZWNvbmQgb3BlcmFuZFxyXG4gKiBAcmV0dXJucyB7cXVhdDJ9IG91dFxyXG4gKiBAZnVuY3Rpb25cclxuICovXG5cblxuZnVuY3Rpb24gYWRkKG91dCwgYSwgYikge1xuICBvdXRbMF0gPSBhWzBdICsgYlswXTtcbiAgb3V0WzFdID0gYVsxXSArIGJbMV07XG4gIG91dFsyXSA9IGFbMl0gKyBiWzJdO1xuICBvdXRbM10gPSBhWzNdICsgYlszXTtcbiAgb3V0WzRdID0gYVs0XSArIGJbNF07XG4gIG91dFs1XSA9IGFbNV0gKyBiWzVdO1xuICBvdXRbNl0gPSBhWzZdICsgYls2XTtcbiAgb3V0WzddID0gYVs3XSArIGJbN107XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogTXVsdGlwbGllcyB0d28gZHVhbCBxdWF0J3NcclxuICpcclxuICogQHBhcmFtIHtxdWF0Mn0gb3V0IHRoZSByZWNlaXZpbmcgZHVhbCBxdWF0ZXJuaW9uXHJcbiAqIEBwYXJhbSB7cXVhdDJ9IGEgdGhlIGZpcnN0IG9wZXJhbmRcclxuICogQHBhcmFtIHtxdWF0Mn0gYiB0aGUgc2Vjb25kIG9wZXJhbmRcclxuICogQHJldHVybnMge3F1YXQyfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gbXVsdGlwbHkob3V0LCBhLCBiKSB7XG4gIHZhciBheDAgPSBhWzBdLFxuICAgICAgYXkwID0gYVsxXSxcbiAgICAgIGF6MCA9IGFbMl0sXG4gICAgICBhdzAgPSBhWzNdLFxuICAgICAgYngxID0gYls0XSxcbiAgICAgIGJ5MSA9IGJbNV0sXG4gICAgICBiejEgPSBiWzZdLFxuICAgICAgYncxID0gYls3XSxcbiAgICAgIGF4MSA9IGFbNF0sXG4gICAgICBheTEgPSBhWzVdLFxuICAgICAgYXoxID0gYVs2XSxcbiAgICAgIGF3MSA9IGFbN10sXG4gICAgICBieDAgPSBiWzBdLFxuICAgICAgYnkwID0gYlsxXSxcbiAgICAgIGJ6MCA9IGJbMl0sXG4gICAgICBidzAgPSBiWzNdO1xuICBvdXRbMF0gPSBheDAgKiBidzAgKyBhdzAgKiBieDAgKyBheTAgKiBiejAgLSBhejAgKiBieTA7XG4gIG91dFsxXSA9IGF5MCAqIGJ3MCArIGF3MCAqIGJ5MCArIGF6MCAqIGJ4MCAtIGF4MCAqIGJ6MDtcbiAgb3V0WzJdID0gYXowICogYncwICsgYXcwICogYnowICsgYXgwICogYnkwIC0gYXkwICogYngwO1xuICBvdXRbM10gPSBhdzAgKiBidzAgLSBheDAgKiBieDAgLSBheTAgKiBieTAgLSBhejAgKiBiejA7XG4gIG91dFs0XSA9IGF4MCAqIGJ3MSArIGF3MCAqIGJ4MSArIGF5MCAqIGJ6MSAtIGF6MCAqIGJ5MSArIGF4MSAqIGJ3MCArIGF3MSAqIGJ4MCArIGF5MSAqIGJ6MCAtIGF6MSAqIGJ5MDtcbiAgb3V0WzVdID0gYXkwICogYncxICsgYXcwICogYnkxICsgYXowICogYngxIC0gYXgwICogYnoxICsgYXkxICogYncwICsgYXcxICogYnkwICsgYXoxICogYngwIC0gYXgxICogYnowO1xuICBvdXRbNl0gPSBhejAgKiBidzEgKyBhdzAgKiBiejEgKyBheDAgKiBieTEgLSBheTAgKiBieDEgKyBhejEgKiBidzAgKyBhdzEgKiBiejAgKyBheDEgKiBieTAgLSBheTEgKiBieDA7XG4gIG91dFs3XSA9IGF3MCAqIGJ3MSAtIGF4MCAqIGJ4MSAtIGF5MCAqIGJ5MSAtIGF6MCAqIGJ6MSArIGF3MSAqIGJ3MCAtIGF4MSAqIGJ4MCAtIGF5MSAqIGJ5MCAtIGF6MSAqIGJ6MDtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBBbGlhcyBmb3Ige0BsaW5rIHF1YXQyLm11bHRpcGx5fVxyXG4gKiBAZnVuY3Rpb25cclxuICovXG5cblxudmFyIG11bCA9IG11bHRpcGx5O1xuLyoqXHJcbiAqIFNjYWxlcyBhIGR1YWwgcXVhdCBieSBhIHNjYWxhciBudW1iZXJcclxuICpcclxuICogQHBhcmFtIHtxdWF0Mn0gb3V0IHRoZSByZWNlaXZpbmcgZHVhbCBxdWF0XHJcbiAqIEBwYXJhbSB7cXVhdDJ9IGEgdGhlIGR1YWwgcXVhdCB0byBzY2FsZVxyXG4gKiBAcGFyYW0ge051bWJlcn0gYiBhbW91bnQgdG8gc2NhbGUgdGhlIGR1YWwgcXVhdCBieVxyXG4gKiBAcmV0dXJucyB7cXVhdDJ9IG91dFxyXG4gKiBAZnVuY3Rpb25cclxuICovXG5cbmV4cG9ydHMubXVsID0gbXVsO1xuXG5mdW5jdGlvbiBzY2FsZShvdXQsIGEsIGIpIHtcbiAgb3V0WzBdID0gYVswXSAqIGI7XG4gIG91dFsxXSA9IGFbMV0gKiBiO1xuICBvdXRbMl0gPSBhWzJdICogYjtcbiAgb3V0WzNdID0gYVszXSAqIGI7XG4gIG91dFs0XSA9IGFbNF0gKiBiO1xuICBvdXRbNV0gPSBhWzVdICogYjtcbiAgb3V0WzZdID0gYVs2XSAqIGI7XG4gIG91dFs3XSA9IGFbN10gKiBiO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIENhbGN1bGF0ZXMgdGhlIGRvdCBwcm9kdWN0IG9mIHR3byBkdWFsIHF1YXQncyAoVGhlIGRvdCBwcm9kdWN0IG9mIHRoZSByZWFsIHBhcnRzKVxyXG4gKlxyXG4gKiBAcGFyYW0ge3F1YXQyfSBhIHRoZSBmaXJzdCBvcGVyYW5kXHJcbiAqIEBwYXJhbSB7cXVhdDJ9IGIgdGhlIHNlY29uZCBvcGVyYW5kXHJcbiAqIEByZXR1cm5zIHtOdW1iZXJ9IGRvdCBwcm9kdWN0IG9mIGEgYW5kIGJcclxuICogQGZ1bmN0aW9uXHJcbiAqL1xuXG5cbnZhciBkb3QgPSBxdWF0LmRvdDtcbi8qKlxyXG4gKiBQZXJmb3JtcyBhIGxpbmVhciBpbnRlcnBvbGF0aW9uIGJldHdlZW4gdHdvIGR1YWwgcXVhdHMnc1xyXG4gKiBOT1RFOiBUaGUgcmVzdWx0aW5nIGR1YWwgcXVhdGVybmlvbnMgd29uJ3QgYWx3YXlzIGJlIG5vcm1hbGl6ZWQgKFRoZSBlcnJvciBpcyBtb3N0IG5vdGljZWFibGUgd2hlbiB0ID0gMC41KVxyXG4gKlxyXG4gKiBAcGFyYW0ge3F1YXQyfSBvdXQgdGhlIHJlY2VpdmluZyBkdWFsIHF1YXRcclxuICogQHBhcmFtIHtxdWF0Mn0gYSB0aGUgZmlyc3Qgb3BlcmFuZFxyXG4gKiBAcGFyYW0ge3F1YXQyfSBiIHRoZSBzZWNvbmQgb3BlcmFuZFxyXG4gKiBAcGFyYW0ge051bWJlcn0gdCBpbnRlcnBvbGF0aW9uIGFtb3VudCwgaW4gdGhlIHJhbmdlIFswLTFdLCBiZXR3ZWVuIHRoZSB0d28gaW5wdXRzXHJcbiAqIEByZXR1cm5zIHtxdWF0Mn0gb3V0XHJcbiAqL1xuXG5leHBvcnRzLmRvdCA9IGRvdDtcblxuZnVuY3Rpb24gbGVycChvdXQsIGEsIGIsIHQpIHtcbiAgdmFyIG10ID0gMSAtIHQ7XG4gIGlmIChkb3QoYSwgYikgPCAwKSB0ID0gLXQ7XG4gIG91dFswXSA9IGFbMF0gKiBtdCArIGJbMF0gKiB0O1xuICBvdXRbMV0gPSBhWzFdICogbXQgKyBiWzFdICogdDtcbiAgb3V0WzJdID0gYVsyXSAqIG10ICsgYlsyXSAqIHQ7XG4gIG91dFszXSA9IGFbM10gKiBtdCArIGJbM10gKiB0O1xuICBvdXRbNF0gPSBhWzRdICogbXQgKyBiWzRdICogdDtcbiAgb3V0WzVdID0gYVs1XSAqIG10ICsgYls1XSAqIHQ7XG4gIG91dFs2XSA9IGFbNl0gKiBtdCArIGJbNl0gKiB0O1xuICBvdXRbN10gPSBhWzddICogbXQgKyBiWzddICogdDtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBDYWxjdWxhdGVzIHRoZSBpbnZlcnNlIG9mIGEgZHVhbCBxdWF0LiBJZiB0aGV5IGFyZSBub3JtYWxpemVkLCBjb25qdWdhdGUgaXMgY2hlYXBlclxyXG4gKlxyXG4gKiBAcGFyYW0ge3F1YXQyfSBvdXQgdGhlIHJlY2VpdmluZyBkdWFsIHF1YXRlcm5pb25cclxuICogQHBhcmFtIHtxdWF0Mn0gYSBkdWFsIHF1YXQgdG8gY2FsY3VsYXRlIGludmVyc2Ugb2ZcclxuICogQHJldHVybnMge3F1YXQyfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gaW52ZXJ0KG91dCwgYSkge1xuICB2YXIgc3FsZW4gPSBzcXVhcmVkTGVuZ3RoKGEpO1xuICBvdXRbMF0gPSAtYVswXSAvIHNxbGVuO1xuICBvdXRbMV0gPSAtYVsxXSAvIHNxbGVuO1xuICBvdXRbMl0gPSAtYVsyXSAvIHNxbGVuO1xuICBvdXRbM10gPSBhWzNdIC8gc3FsZW47XG4gIG91dFs0XSA9IC1hWzRdIC8gc3FsZW47XG4gIG91dFs1XSA9IC1hWzVdIC8gc3FsZW47XG4gIG91dFs2XSA9IC1hWzZdIC8gc3FsZW47XG4gIG91dFs3XSA9IGFbN10gLyBzcWxlbjtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBDYWxjdWxhdGVzIHRoZSBjb25qdWdhdGUgb2YgYSBkdWFsIHF1YXRcclxuICogSWYgdGhlIGR1YWwgcXVhdGVybmlvbiBpcyBub3JtYWxpemVkLCB0aGlzIGZ1bmN0aW9uIGlzIGZhc3RlciB0aGFuIHF1YXQyLmludmVyc2UgYW5kIHByb2R1Y2VzIHRoZSBzYW1lIHJlc3VsdC5cclxuICpcclxuICogQHBhcmFtIHtxdWF0Mn0gb3V0IHRoZSByZWNlaXZpbmcgcXVhdGVybmlvblxyXG4gKiBAcGFyYW0ge3F1YXQyfSBhIHF1YXQgdG8gY2FsY3VsYXRlIGNvbmp1Z2F0ZSBvZlxyXG4gKiBAcmV0dXJucyB7cXVhdDJ9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBjb25qdWdhdGUob3V0LCBhKSB7XG4gIG91dFswXSA9IC1hWzBdO1xuICBvdXRbMV0gPSAtYVsxXTtcbiAgb3V0WzJdID0gLWFbMl07XG4gIG91dFszXSA9IGFbM107XG4gIG91dFs0XSA9IC1hWzRdO1xuICBvdXRbNV0gPSAtYVs1XTtcbiAgb3V0WzZdID0gLWFbNl07XG4gIG91dFs3XSA9IGFbN107XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogQ2FsY3VsYXRlcyB0aGUgbGVuZ3RoIG9mIGEgZHVhbCBxdWF0XHJcbiAqXHJcbiAqIEBwYXJhbSB7cXVhdDJ9IGEgZHVhbCBxdWF0IHRvIGNhbGN1bGF0ZSBsZW5ndGggb2ZcclxuICogQHJldHVybnMge051bWJlcn0gbGVuZ3RoIG9mIGFcclxuICogQGZ1bmN0aW9uXHJcbiAqL1xuXG5cbnZhciBsZW5ndGggPSBxdWF0Lmxlbmd0aDtcbi8qKlxyXG4gKiBBbGlhcyBmb3Ige0BsaW5rIHF1YXQyLmxlbmd0aH1cclxuICogQGZ1bmN0aW9uXHJcbiAqL1xuXG5leHBvcnRzLmxlbmd0aCA9IGxlbmd0aDtcbnZhciBsZW4gPSBsZW5ndGg7XG4vKipcclxuICogQ2FsY3VsYXRlcyB0aGUgc3F1YXJlZCBsZW5ndGggb2YgYSBkdWFsIHF1YXRcclxuICpcclxuICogQHBhcmFtIHtxdWF0Mn0gYSBkdWFsIHF1YXQgdG8gY2FsY3VsYXRlIHNxdWFyZWQgbGVuZ3RoIG9mXHJcbiAqIEByZXR1cm5zIHtOdW1iZXJ9IHNxdWFyZWQgbGVuZ3RoIG9mIGFcclxuICogQGZ1bmN0aW9uXHJcbiAqL1xuXG5leHBvcnRzLmxlbiA9IGxlbjtcbnZhciBzcXVhcmVkTGVuZ3RoID0gcXVhdC5zcXVhcmVkTGVuZ3RoO1xuLyoqXHJcbiAqIEFsaWFzIGZvciB7QGxpbmsgcXVhdDIuc3F1YXJlZExlbmd0aH1cclxuICogQGZ1bmN0aW9uXHJcbiAqL1xuXG5leHBvcnRzLnNxdWFyZWRMZW5ndGggPSBzcXVhcmVkTGVuZ3RoO1xudmFyIHNxckxlbiA9IHNxdWFyZWRMZW5ndGg7XG4vKipcclxuICogTm9ybWFsaXplIGEgZHVhbCBxdWF0XHJcbiAqXHJcbiAqIEBwYXJhbSB7cXVhdDJ9IG91dCB0aGUgcmVjZWl2aW5nIGR1YWwgcXVhdGVybmlvblxyXG4gKiBAcGFyYW0ge3F1YXQyfSBhIGR1YWwgcXVhdGVybmlvbiB0byBub3JtYWxpemVcclxuICogQHJldHVybnMge3F1YXQyfSBvdXRcclxuICogQGZ1bmN0aW9uXHJcbiAqL1xuXG5leHBvcnRzLnNxckxlbiA9IHNxckxlbjtcblxuZnVuY3Rpb24gbm9ybWFsaXplKG91dCwgYSkge1xuICB2YXIgbWFnbml0dWRlID0gc3F1YXJlZExlbmd0aChhKTtcblxuICBpZiAobWFnbml0dWRlID4gMCkge1xuICAgIG1hZ25pdHVkZSA9IE1hdGguc3FydChtYWduaXR1ZGUpO1xuICAgIHZhciBhMCA9IGFbMF0gLyBtYWduaXR1ZGU7XG4gICAgdmFyIGExID0gYVsxXSAvIG1hZ25pdHVkZTtcbiAgICB2YXIgYTIgPSBhWzJdIC8gbWFnbml0dWRlO1xuICAgIHZhciBhMyA9IGFbM10gLyBtYWduaXR1ZGU7XG4gICAgdmFyIGIwID0gYVs0XTtcbiAgICB2YXIgYjEgPSBhWzVdO1xuICAgIHZhciBiMiA9IGFbNl07XG4gICAgdmFyIGIzID0gYVs3XTtcbiAgICB2YXIgYV9kb3RfYiA9IGEwICogYjAgKyBhMSAqIGIxICsgYTIgKiBiMiArIGEzICogYjM7XG4gICAgb3V0WzBdID0gYTA7XG4gICAgb3V0WzFdID0gYTE7XG4gICAgb3V0WzJdID0gYTI7XG4gICAgb3V0WzNdID0gYTM7XG4gICAgb3V0WzRdID0gKGIwIC0gYTAgKiBhX2RvdF9iKSAvIG1hZ25pdHVkZTtcbiAgICBvdXRbNV0gPSAoYjEgLSBhMSAqIGFfZG90X2IpIC8gbWFnbml0dWRlO1xuICAgIG91dFs2XSA9IChiMiAtIGEyICogYV9kb3RfYikgLyBtYWduaXR1ZGU7XG4gICAgb3V0WzddID0gKGIzIC0gYTMgKiBhX2RvdF9iKSAvIG1hZ25pdHVkZTtcbiAgfVxuXG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogUmV0dXJucyBhIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiBhIGR1YWwgcXVhdGVuaW9uXHJcbiAqXHJcbiAqIEBwYXJhbSB7cXVhdDJ9IGEgZHVhbCBxdWF0ZXJuaW9uIHRvIHJlcHJlc2VudCBhcyBhIHN0cmluZ1xyXG4gKiBAcmV0dXJucyB7U3RyaW5nfSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgdGhlIGR1YWwgcXVhdFxyXG4gKi9cblxuXG5mdW5jdGlvbiBzdHIoYSkge1xuICByZXR1cm4gXCJxdWF0MihcIiArIGFbMF0gKyBcIiwgXCIgKyBhWzFdICsgXCIsIFwiICsgYVsyXSArIFwiLCBcIiArIGFbM10gKyBcIiwgXCIgKyBhWzRdICsgXCIsIFwiICsgYVs1XSArIFwiLCBcIiArIGFbNl0gKyBcIiwgXCIgKyBhWzddICsgXCIpXCI7XG59XG4vKipcclxuICogUmV0dXJucyB3aGV0aGVyIG9yIG5vdCB0aGUgZHVhbCBxdWF0ZXJuaW9ucyBoYXZlIGV4YWN0bHkgdGhlIHNhbWUgZWxlbWVudHMgaW4gdGhlIHNhbWUgcG9zaXRpb24gKHdoZW4gY29tcGFyZWQgd2l0aCA9PT0pXHJcbiAqXHJcbiAqIEBwYXJhbSB7cXVhdDJ9IGEgdGhlIGZpcnN0IGR1YWwgcXVhdGVybmlvbi5cclxuICogQHBhcmFtIHtxdWF0Mn0gYiB0aGUgc2Vjb25kIGR1YWwgcXVhdGVybmlvbi5cclxuICogQHJldHVybnMge0Jvb2xlYW59IHRydWUgaWYgdGhlIGR1YWwgcXVhdGVybmlvbnMgYXJlIGVxdWFsLCBmYWxzZSBvdGhlcndpc2UuXHJcbiAqL1xuXG5cbmZ1bmN0aW9uIGV4YWN0RXF1YWxzKGEsIGIpIHtcbiAgcmV0dXJuIGFbMF0gPT09IGJbMF0gJiYgYVsxXSA9PT0gYlsxXSAmJiBhWzJdID09PSBiWzJdICYmIGFbM10gPT09IGJbM10gJiYgYVs0XSA9PT0gYls0XSAmJiBhWzVdID09PSBiWzVdICYmIGFbNl0gPT09IGJbNl0gJiYgYVs3XSA9PT0gYls3XTtcbn1cbi8qKlxyXG4gKiBSZXR1cm5zIHdoZXRoZXIgb3Igbm90IHRoZSBkdWFsIHF1YXRlcm5pb25zIGhhdmUgYXBwcm94aW1hdGVseSB0aGUgc2FtZSBlbGVtZW50cyBpbiB0aGUgc2FtZSBwb3NpdGlvbi5cclxuICpcclxuICogQHBhcmFtIHtxdWF0Mn0gYSB0aGUgZmlyc3QgZHVhbCBxdWF0LlxyXG4gKiBAcGFyYW0ge3F1YXQyfSBiIHRoZSBzZWNvbmQgZHVhbCBxdWF0LlxyXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn0gdHJ1ZSBpZiB0aGUgZHVhbCBxdWF0cyBhcmUgZXF1YWwsIGZhbHNlIG90aGVyd2lzZS5cclxuICovXG5cblxuZnVuY3Rpb24gZXF1YWxzKGEsIGIpIHtcbiAgdmFyIGEwID0gYVswXSxcbiAgICAgIGExID0gYVsxXSxcbiAgICAgIGEyID0gYVsyXSxcbiAgICAgIGEzID0gYVszXSxcbiAgICAgIGE0ID0gYVs0XSxcbiAgICAgIGE1ID0gYVs1XSxcbiAgICAgIGE2ID0gYVs2XSxcbiAgICAgIGE3ID0gYVs3XTtcbiAgdmFyIGIwID0gYlswXSxcbiAgICAgIGIxID0gYlsxXSxcbiAgICAgIGIyID0gYlsyXSxcbiAgICAgIGIzID0gYlszXSxcbiAgICAgIGI0ID0gYls0XSxcbiAgICAgIGI1ID0gYls1XSxcbiAgICAgIGI2ID0gYls2XSxcbiAgICAgIGI3ID0gYls3XTtcbiAgcmV0dXJuIE1hdGguYWJzKGEwIC0gYjApIDw9IGdsTWF0cml4LkVQU0lMT04gKiBNYXRoLm1heCgxLjAsIE1hdGguYWJzKGEwKSwgTWF0aC5hYnMoYjApKSAmJiBNYXRoLmFicyhhMSAtIGIxKSA8PSBnbE1hdHJpeC5FUFNJTE9OICogTWF0aC5tYXgoMS4wLCBNYXRoLmFicyhhMSksIE1hdGguYWJzKGIxKSkgJiYgTWF0aC5hYnMoYTIgLSBiMikgPD0gZ2xNYXRyaXguRVBTSUxPTiAqIE1hdGgubWF4KDEuMCwgTWF0aC5hYnMoYTIpLCBNYXRoLmFicyhiMikpICYmIE1hdGguYWJzKGEzIC0gYjMpIDw9IGdsTWF0cml4LkVQU0lMT04gKiBNYXRoLm1heCgxLjAsIE1hdGguYWJzKGEzKSwgTWF0aC5hYnMoYjMpKSAmJiBNYXRoLmFicyhhNCAtIGI0KSA8PSBnbE1hdHJpeC5FUFNJTE9OICogTWF0aC5tYXgoMS4wLCBNYXRoLmFicyhhNCksIE1hdGguYWJzKGI0KSkgJiYgTWF0aC5hYnMoYTUgLSBiNSkgPD0gZ2xNYXRyaXguRVBTSUxPTiAqIE1hdGgubWF4KDEuMCwgTWF0aC5hYnMoYTUpLCBNYXRoLmFicyhiNSkpICYmIE1hdGguYWJzKGE2IC0gYjYpIDw9IGdsTWF0cml4LkVQU0lMT04gKiBNYXRoLm1heCgxLjAsIE1hdGguYWJzKGE2KSwgTWF0aC5hYnMoYjYpKSAmJiBNYXRoLmFicyhhNyAtIGI3KSA8PSBnbE1hdHJpeC5FUFNJTE9OICogTWF0aC5tYXgoMS4wLCBNYXRoLmFicyhhNyksIE1hdGguYWJzKGI3KSk7XG59IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IFwiQGJhYmVsL2hlbHBlcnMgLSB0eXBlb2ZcIjsgaWYgKHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiB0eXBlb2YgU3ltYm9sLml0ZXJhdG9yID09PSBcInN5bWJvbFwiKSB7IF90eXBlb2YgPSBmdW5jdGlvbiBfdHlwZW9mKG9iaikgeyByZXR1cm4gdHlwZW9mIG9iajsgfTsgfSBlbHNlIHsgX3R5cGVvZiA9IGZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IHJldHVybiBvYmogJiYgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9iai5jb25zdHJ1Y3RvciA9PT0gU3ltYm9sICYmIG9iaiAhPT0gU3ltYm9sLnByb3RvdHlwZSA/IFwic3ltYm9sXCIgOiB0eXBlb2Ygb2JqOyB9OyB9IHJldHVybiBfdHlwZW9mKG9iaik7IH1cblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuY3JlYXRlID0gY3JlYXRlO1xuZXhwb3J0cy5jbG9uZSA9IGNsb25lO1xuZXhwb3J0cy5mcm9tVmFsdWVzID0gZnJvbVZhbHVlcztcbmV4cG9ydHMuY29weSA9IGNvcHk7XG5leHBvcnRzLnNldCA9IHNldDtcbmV4cG9ydHMuYWRkID0gYWRkO1xuZXhwb3J0cy5zdWJ0cmFjdCA9IHN1YnRyYWN0O1xuZXhwb3J0cy5tdWx0aXBseSA9IG11bHRpcGx5O1xuZXhwb3J0cy5kaXZpZGUgPSBkaXZpZGU7XG5leHBvcnRzLmNlaWwgPSBjZWlsO1xuZXhwb3J0cy5mbG9vciA9IGZsb29yO1xuZXhwb3J0cy5taW4gPSBtaW47XG5leHBvcnRzLm1heCA9IG1heDtcbmV4cG9ydHMucm91bmQgPSByb3VuZDtcbmV4cG9ydHMuc2NhbGUgPSBzY2FsZTtcbmV4cG9ydHMuc2NhbGVBbmRBZGQgPSBzY2FsZUFuZEFkZDtcbmV4cG9ydHMuZGlzdGFuY2UgPSBkaXN0YW5jZTtcbmV4cG9ydHMuc3F1YXJlZERpc3RhbmNlID0gc3F1YXJlZERpc3RhbmNlO1xuZXhwb3J0cy5sZW5ndGggPSBsZW5ndGg7XG5leHBvcnRzLnNxdWFyZWRMZW5ndGggPSBzcXVhcmVkTGVuZ3RoO1xuZXhwb3J0cy5uZWdhdGUgPSBuZWdhdGU7XG5leHBvcnRzLmludmVyc2UgPSBpbnZlcnNlO1xuZXhwb3J0cy5ub3JtYWxpemUgPSBub3JtYWxpemU7XG5leHBvcnRzLmRvdCA9IGRvdDtcbmV4cG9ydHMuY3Jvc3MgPSBjcm9zcztcbmV4cG9ydHMubGVycCA9IGxlcnA7XG5leHBvcnRzLnJhbmRvbSA9IHJhbmRvbTtcbmV4cG9ydHMudHJhbnNmb3JtTWF0MiA9IHRyYW5zZm9ybU1hdDI7XG5leHBvcnRzLnRyYW5zZm9ybU1hdDJkID0gdHJhbnNmb3JtTWF0MmQ7XG5leHBvcnRzLnRyYW5zZm9ybU1hdDMgPSB0cmFuc2Zvcm1NYXQzO1xuZXhwb3J0cy50cmFuc2Zvcm1NYXQ0ID0gdHJhbnNmb3JtTWF0NDtcbmV4cG9ydHMucm90YXRlID0gcm90YXRlO1xuZXhwb3J0cy5hbmdsZSA9IGFuZ2xlO1xuZXhwb3J0cy56ZXJvID0gemVybztcbmV4cG9ydHMuc3RyID0gc3RyO1xuZXhwb3J0cy5leGFjdEVxdWFscyA9IGV4YWN0RXF1YWxzO1xuZXhwb3J0cy5lcXVhbHMgPSBlcXVhbHM7XG5leHBvcnRzLmZvckVhY2ggPSBleHBvcnRzLnNxckxlbiA9IGV4cG9ydHMuc3FyRGlzdCA9IGV4cG9ydHMuZGlzdCA9IGV4cG9ydHMuZGl2ID0gZXhwb3J0cy5tdWwgPSBleHBvcnRzLnN1YiA9IGV4cG9ydHMubGVuID0gdm9pZCAwO1xuXG52YXIgZ2xNYXRyaXggPSBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChyZXF1aXJlKFwiLi9jb21tb24uanNcIikpO1xuXG5mdW5jdGlvbiBfZ2V0UmVxdWlyZVdpbGRjYXJkQ2FjaGUoKSB7IGlmICh0eXBlb2YgV2Vha01hcCAhPT0gXCJmdW5jdGlvblwiKSByZXR1cm4gbnVsbDsgdmFyIGNhY2hlID0gbmV3IFdlYWtNYXAoKTsgX2dldFJlcXVpcmVXaWxkY2FyZENhY2hlID0gZnVuY3Rpb24gX2dldFJlcXVpcmVXaWxkY2FyZENhY2hlKCkgeyByZXR1cm4gY2FjaGU7IH07IHJldHVybiBjYWNoZTsgfVxuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZChvYmopIHsgaWYgKG9iaiAmJiBvYmouX19lc01vZHVsZSkgeyByZXR1cm4gb2JqOyB9IGlmIChvYmogPT09IG51bGwgfHwgX3R5cGVvZihvYmopICE9PSBcIm9iamVjdFwiICYmIHR5cGVvZiBvYmogIT09IFwiZnVuY3Rpb25cIikgeyByZXR1cm4geyBcImRlZmF1bHRcIjogb2JqIH07IH0gdmFyIGNhY2hlID0gX2dldFJlcXVpcmVXaWxkY2FyZENhY2hlKCk7IGlmIChjYWNoZSAmJiBjYWNoZS5oYXMob2JqKSkgeyByZXR1cm4gY2FjaGUuZ2V0KG9iaik7IH0gdmFyIG5ld09iaiA9IHt9OyB2YXIgaGFzUHJvcGVydHlEZXNjcmlwdG9yID0gT2JqZWN0LmRlZmluZVByb3BlcnR5ICYmIE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3I7IGZvciAodmFyIGtleSBpbiBvYmopIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSkpIHsgdmFyIGRlc2MgPSBoYXNQcm9wZXJ0eURlc2NyaXB0b3IgPyBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iaiwga2V5KSA6IG51bGw7IGlmIChkZXNjICYmIChkZXNjLmdldCB8fCBkZXNjLnNldCkpIHsgT2JqZWN0LmRlZmluZVByb3BlcnR5KG5ld09iaiwga2V5LCBkZXNjKTsgfSBlbHNlIHsgbmV3T2JqW2tleV0gPSBvYmpba2V5XTsgfSB9IH0gbmV3T2JqW1wiZGVmYXVsdFwiXSA9IG9iajsgaWYgKGNhY2hlKSB7IGNhY2hlLnNldChvYmosIG5ld09iaik7IH0gcmV0dXJuIG5ld09iajsgfVxuXG4vKipcclxuICogMiBEaW1lbnNpb25hbCBWZWN0b3JcclxuICogQG1vZHVsZSB2ZWMyXHJcbiAqL1xuXG4vKipcclxuICogQ3JlYXRlcyBhIG5ldywgZW1wdHkgdmVjMlxyXG4gKlxyXG4gKiBAcmV0dXJucyB7dmVjMn0gYSBuZXcgMkQgdmVjdG9yXHJcbiAqL1xuZnVuY3Rpb24gY3JlYXRlKCkge1xuICB2YXIgb3V0ID0gbmV3IGdsTWF0cml4LkFSUkFZX1RZUEUoMik7XG5cbiAgaWYgKGdsTWF0cml4LkFSUkFZX1RZUEUgIT0gRmxvYXQzMkFycmF5KSB7XG4gICAgb3V0WzBdID0gMDtcbiAgICBvdXRbMV0gPSAwO1xuICB9XG5cbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBDcmVhdGVzIGEgbmV3IHZlYzIgaW5pdGlhbGl6ZWQgd2l0aCB2YWx1ZXMgZnJvbSBhbiBleGlzdGluZyB2ZWN0b3JcclxuICpcclxuICogQHBhcmFtIHt2ZWMyfSBhIHZlY3RvciB0byBjbG9uZVxyXG4gKiBAcmV0dXJucyB7dmVjMn0gYSBuZXcgMkQgdmVjdG9yXHJcbiAqL1xuXG5cbmZ1bmN0aW9uIGNsb25lKGEpIHtcbiAgdmFyIG91dCA9IG5ldyBnbE1hdHJpeC5BUlJBWV9UWVBFKDIpO1xuICBvdXRbMF0gPSBhWzBdO1xuICBvdXRbMV0gPSBhWzFdO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIENyZWF0ZXMgYSBuZXcgdmVjMiBpbml0aWFsaXplZCB3aXRoIHRoZSBnaXZlbiB2YWx1ZXNcclxuICpcclxuICogQHBhcmFtIHtOdW1iZXJ9IHggWCBjb21wb25lbnRcclxuICogQHBhcmFtIHtOdW1iZXJ9IHkgWSBjb21wb25lbnRcclxuICogQHJldHVybnMge3ZlYzJ9IGEgbmV3IDJEIHZlY3RvclxyXG4gKi9cblxuXG5mdW5jdGlvbiBmcm9tVmFsdWVzKHgsIHkpIHtcbiAgdmFyIG91dCA9IG5ldyBnbE1hdHJpeC5BUlJBWV9UWVBFKDIpO1xuICBvdXRbMF0gPSB4O1xuICBvdXRbMV0gPSB5O1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIENvcHkgdGhlIHZhbHVlcyBmcm9tIG9uZSB2ZWMyIHRvIGFub3RoZXJcclxuICpcclxuICogQHBhcmFtIHt2ZWMyfSBvdXQgdGhlIHJlY2VpdmluZyB2ZWN0b3JcclxuICogQHBhcmFtIHt2ZWMyfSBhIHRoZSBzb3VyY2UgdmVjdG9yXHJcbiAqIEByZXR1cm5zIHt2ZWMyfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gY29weShvdXQsIGEpIHtcbiAgb3V0WzBdID0gYVswXTtcbiAgb3V0WzFdID0gYVsxXTtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBTZXQgdGhlIGNvbXBvbmVudHMgb2YgYSB2ZWMyIHRvIHRoZSBnaXZlbiB2YWx1ZXNcclxuICpcclxuICogQHBhcmFtIHt2ZWMyfSBvdXQgdGhlIHJlY2VpdmluZyB2ZWN0b3JcclxuICogQHBhcmFtIHtOdW1iZXJ9IHggWCBjb21wb25lbnRcclxuICogQHBhcmFtIHtOdW1iZXJ9IHkgWSBjb21wb25lbnRcclxuICogQHJldHVybnMge3ZlYzJ9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBzZXQob3V0LCB4LCB5KSB7XG4gIG91dFswXSA9IHg7XG4gIG91dFsxXSA9IHk7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogQWRkcyB0d28gdmVjMidzXHJcbiAqXHJcbiAqIEBwYXJhbSB7dmVjMn0gb3V0IHRoZSByZWNlaXZpbmcgdmVjdG9yXHJcbiAqIEBwYXJhbSB7dmVjMn0gYSB0aGUgZmlyc3Qgb3BlcmFuZFxyXG4gKiBAcGFyYW0ge3ZlYzJ9IGIgdGhlIHNlY29uZCBvcGVyYW5kXHJcbiAqIEByZXR1cm5zIHt2ZWMyfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gYWRkKG91dCwgYSwgYikge1xuICBvdXRbMF0gPSBhWzBdICsgYlswXTtcbiAgb3V0WzFdID0gYVsxXSArIGJbMV07XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogU3VidHJhY3RzIHZlY3RvciBiIGZyb20gdmVjdG9yIGFcclxuICpcclxuICogQHBhcmFtIHt2ZWMyfSBvdXQgdGhlIHJlY2VpdmluZyB2ZWN0b3JcclxuICogQHBhcmFtIHt2ZWMyfSBhIHRoZSBmaXJzdCBvcGVyYW5kXHJcbiAqIEBwYXJhbSB7dmVjMn0gYiB0aGUgc2Vjb25kIG9wZXJhbmRcclxuICogQHJldHVybnMge3ZlYzJ9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBzdWJ0cmFjdChvdXQsIGEsIGIpIHtcbiAgb3V0WzBdID0gYVswXSAtIGJbMF07XG4gIG91dFsxXSA9IGFbMV0gLSBiWzFdO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIE11bHRpcGxpZXMgdHdvIHZlYzInc1xyXG4gKlxyXG4gKiBAcGFyYW0ge3ZlYzJ9IG91dCB0aGUgcmVjZWl2aW5nIHZlY3RvclxyXG4gKiBAcGFyYW0ge3ZlYzJ9IGEgdGhlIGZpcnN0IG9wZXJhbmRcclxuICogQHBhcmFtIHt2ZWMyfSBiIHRoZSBzZWNvbmQgb3BlcmFuZFxyXG4gKiBAcmV0dXJucyB7dmVjMn0gb3V0XHJcbiAqL1xuXG5cbmZ1bmN0aW9uIG11bHRpcGx5KG91dCwgYSwgYikge1xuICBvdXRbMF0gPSBhWzBdICogYlswXTtcbiAgb3V0WzFdID0gYVsxXSAqIGJbMV07XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogRGl2aWRlcyB0d28gdmVjMidzXHJcbiAqXHJcbiAqIEBwYXJhbSB7dmVjMn0gb3V0IHRoZSByZWNlaXZpbmcgdmVjdG9yXHJcbiAqIEBwYXJhbSB7dmVjMn0gYSB0aGUgZmlyc3Qgb3BlcmFuZFxyXG4gKiBAcGFyYW0ge3ZlYzJ9IGIgdGhlIHNlY29uZCBvcGVyYW5kXHJcbiAqIEByZXR1cm5zIHt2ZWMyfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gZGl2aWRlKG91dCwgYSwgYikge1xuICBvdXRbMF0gPSBhWzBdIC8gYlswXTtcbiAgb3V0WzFdID0gYVsxXSAvIGJbMV07XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogTWF0aC5jZWlsIHRoZSBjb21wb25lbnRzIG9mIGEgdmVjMlxyXG4gKlxyXG4gKiBAcGFyYW0ge3ZlYzJ9IG91dCB0aGUgcmVjZWl2aW5nIHZlY3RvclxyXG4gKiBAcGFyYW0ge3ZlYzJ9IGEgdmVjdG9yIHRvIGNlaWxcclxuICogQHJldHVybnMge3ZlYzJ9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBjZWlsKG91dCwgYSkge1xuICBvdXRbMF0gPSBNYXRoLmNlaWwoYVswXSk7XG4gIG91dFsxXSA9IE1hdGguY2VpbChhWzFdKTtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBNYXRoLmZsb29yIHRoZSBjb21wb25lbnRzIG9mIGEgdmVjMlxyXG4gKlxyXG4gKiBAcGFyYW0ge3ZlYzJ9IG91dCB0aGUgcmVjZWl2aW5nIHZlY3RvclxyXG4gKiBAcGFyYW0ge3ZlYzJ9IGEgdmVjdG9yIHRvIGZsb29yXHJcbiAqIEByZXR1cm5zIHt2ZWMyfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gZmxvb3Iob3V0LCBhKSB7XG4gIG91dFswXSA9IE1hdGguZmxvb3IoYVswXSk7XG4gIG91dFsxXSA9IE1hdGguZmxvb3IoYVsxXSk7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogUmV0dXJucyB0aGUgbWluaW11bSBvZiB0d28gdmVjMidzXHJcbiAqXHJcbiAqIEBwYXJhbSB7dmVjMn0gb3V0IHRoZSByZWNlaXZpbmcgdmVjdG9yXHJcbiAqIEBwYXJhbSB7dmVjMn0gYSB0aGUgZmlyc3Qgb3BlcmFuZFxyXG4gKiBAcGFyYW0ge3ZlYzJ9IGIgdGhlIHNlY29uZCBvcGVyYW5kXHJcbiAqIEByZXR1cm5zIHt2ZWMyfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gbWluKG91dCwgYSwgYikge1xuICBvdXRbMF0gPSBNYXRoLm1pbihhWzBdLCBiWzBdKTtcbiAgb3V0WzFdID0gTWF0aC5taW4oYVsxXSwgYlsxXSk7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogUmV0dXJucyB0aGUgbWF4aW11bSBvZiB0d28gdmVjMidzXHJcbiAqXHJcbiAqIEBwYXJhbSB7dmVjMn0gb3V0IHRoZSByZWNlaXZpbmcgdmVjdG9yXHJcbiAqIEBwYXJhbSB7dmVjMn0gYSB0aGUgZmlyc3Qgb3BlcmFuZFxyXG4gKiBAcGFyYW0ge3ZlYzJ9IGIgdGhlIHNlY29uZCBvcGVyYW5kXHJcbiAqIEByZXR1cm5zIHt2ZWMyfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gbWF4KG91dCwgYSwgYikge1xuICBvdXRbMF0gPSBNYXRoLm1heChhWzBdLCBiWzBdKTtcbiAgb3V0WzFdID0gTWF0aC5tYXgoYVsxXSwgYlsxXSk7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogTWF0aC5yb3VuZCB0aGUgY29tcG9uZW50cyBvZiBhIHZlYzJcclxuICpcclxuICogQHBhcmFtIHt2ZWMyfSBvdXQgdGhlIHJlY2VpdmluZyB2ZWN0b3JcclxuICogQHBhcmFtIHt2ZWMyfSBhIHZlY3RvciB0byByb3VuZFxyXG4gKiBAcmV0dXJucyB7dmVjMn0gb3V0XHJcbiAqL1xuXG5cbmZ1bmN0aW9uIHJvdW5kKG91dCwgYSkge1xuICBvdXRbMF0gPSBNYXRoLnJvdW5kKGFbMF0pO1xuICBvdXRbMV0gPSBNYXRoLnJvdW5kKGFbMV0pO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIFNjYWxlcyBhIHZlYzIgYnkgYSBzY2FsYXIgbnVtYmVyXHJcbiAqXHJcbiAqIEBwYXJhbSB7dmVjMn0gb3V0IHRoZSByZWNlaXZpbmcgdmVjdG9yXHJcbiAqIEBwYXJhbSB7dmVjMn0gYSB0aGUgdmVjdG9yIHRvIHNjYWxlXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBiIGFtb3VudCB0byBzY2FsZSB0aGUgdmVjdG9yIGJ5XHJcbiAqIEByZXR1cm5zIHt2ZWMyfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gc2NhbGUob3V0LCBhLCBiKSB7XG4gIG91dFswXSA9IGFbMF0gKiBiO1xuICBvdXRbMV0gPSBhWzFdICogYjtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBBZGRzIHR3byB2ZWMyJ3MgYWZ0ZXIgc2NhbGluZyB0aGUgc2Vjb25kIG9wZXJhbmQgYnkgYSBzY2FsYXIgdmFsdWVcclxuICpcclxuICogQHBhcmFtIHt2ZWMyfSBvdXQgdGhlIHJlY2VpdmluZyB2ZWN0b3JcclxuICogQHBhcmFtIHt2ZWMyfSBhIHRoZSBmaXJzdCBvcGVyYW5kXHJcbiAqIEBwYXJhbSB7dmVjMn0gYiB0aGUgc2Vjb25kIG9wZXJhbmRcclxuICogQHBhcmFtIHtOdW1iZXJ9IHNjYWxlIHRoZSBhbW91bnQgdG8gc2NhbGUgYiBieSBiZWZvcmUgYWRkaW5nXHJcbiAqIEByZXR1cm5zIHt2ZWMyfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gc2NhbGVBbmRBZGQob3V0LCBhLCBiLCBzY2FsZSkge1xuICBvdXRbMF0gPSBhWzBdICsgYlswXSAqIHNjYWxlO1xuICBvdXRbMV0gPSBhWzFdICsgYlsxXSAqIHNjYWxlO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIENhbGN1bGF0ZXMgdGhlIGV1Y2xpZGlhbiBkaXN0YW5jZSBiZXR3ZWVuIHR3byB2ZWMyJ3NcclxuICpcclxuICogQHBhcmFtIHt2ZWMyfSBhIHRoZSBmaXJzdCBvcGVyYW5kXHJcbiAqIEBwYXJhbSB7dmVjMn0gYiB0aGUgc2Vjb25kIG9wZXJhbmRcclxuICogQHJldHVybnMge051bWJlcn0gZGlzdGFuY2UgYmV0d2VlbiBhIGFuZCBiXHJcbiAqL1xuXG5cbmZ1bmN0aW9uIGRpc3RhbmNlKGEsIGIpIHtcbiAgdmFyIHggPSBiWzBdIC0gYVswXSxcbiAgICAgIHkgPSBiWzFdIC0gYVsxXTtcbiAgcmV0dXJuIE1hdGguaHlwb3QoeCwgeSk7XG59XG4vKipcclxuICogQ2FsY3VsYXRlcyB0aGUgc3F1YXJlZCBldWNsaWRpYW4gZGlzdGFuY2UgYmV0d2VlbiB0d28gdmVjMidzXHJcbiAqXHJcbiAqIEBwYXJhbSB7dmVjMn0gYSB0aGUgZmlyc3Qgb3BlcmFuZFxyXG4gKiBAcGFyYW0ge3ZlYzJ9IGIgdGhlIHNlY29uZCBvcGVyYW5kXHJcbiAqIEByZXR1cm5zIHtOdW1iZXJ9IHNxdWFyZWQgZGlzdGFuY2UgYmV0d2VlbiBhIGFuZCBiXHJcbiAqL1xuXG5cbmZ1bmN0aW9uIHNxdWFyZWREaXN0YW5jZShhLCBiKSB7XG4gIHZhciB4ID0gYlswXSAtIGFbMF0sXG4gICAgICB5ID0gYlsxXSAtIGFbMV07XG4gIHJldHVybiB4ICogeCArIHkgKiB5O1xufVxuLyoqXHJcbiAqIENhbGN1bGF0ZXMgdGhlIGxlbmd0aCBvZiBhIHZlYzJcclxuICpcclxuICogQHBhcmFtIHt2ZWMyfSBhIHZlY3RvciB0byBjYWxjdWxhdGUgbGVuZ3RoIG9mXHJcbiAqIEByZXR1cm5zIHtOdW1iZXJ9IGxlbmd0aCBvZiBhXHJcbiAqL1xuXG5cbmZ1bmN0aW9uIGxlbmd0aChhKSB7XG4gIHZhciB4ID0gYVswXSxcbiAgICAgIHkgPSBhWzFdO1xuICByZXR1cm4gTWF0aC5oeXBvdCh4LCB5KTtcbn1cbi8qKlxyXG4gKiBDYWxjdWxhdGVzIHRoZSBzcXVhcmVkIGxlbmd0aCBvZiBhIHZlYzJcclxuICpcclxuICogQHBhcmFtIHt2ZWMyfSBhIHZlY3RvciB0byBjYWxjdWxhdGUgc3F1YXJlZCBsZW5ndGggb2ZcclxuICogQHJldHVybnMge051bWJlcn0gc3F1YXJlZCBsZW5ndGggb2YgYVxyXG4gKi9cblxuXG5mdW5jdGlvbiBzcXVhcmVkTGVuZ3RoKGEpIHtcbiAgdmFyIHggPSBhWzBdLFxuICAgICAgeSA9IGFbMV07XG4gIHJldHVybiB4ICogeCArIHkgKiB5O1xufVxuLyoqXHJcbiAqIE5lZ2F0ZXMgdGhlIGNvbXBvbmVudHMgb2YgYSB2ZWMyXHJcbiAqXHJcbiAqIEBwYXJhbSB7dmVjMn0gb3V0IHRoZSByZWNlaXZpbmcgdmVjdG9yXHJcbiAqIEBwYXJhbSB7dmVjMn0gYSB2ZWN0b3IgdG8gbmVnYXRlXHJcbiAqIEByZXR1cm5zIHt2ZWMyfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gbmVnYXRlKG91dCwgYSkge1xuICBvdXRbMF0gPSAtYVswXTtcbiAgb3V0WzFdID0gLWFbMV07XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogUmV0dXJucyB0aGUgaW52ZXJzZSBvZiB0aGUgY29tcG9uZW50cyBvZiBhIHZlYzJcclxuICpcclxuICogQHBhcmFtIHt2ZWMyfSBvdXQgdGhlIHJlY2VpdmluZyB2ZWN0b3JcclxuICogQHBhcmFtIHt2ZWMyfSBhIHZlY3RvciB0byBpbnZlcnRcclxuICogQHJldHVybnMge3ZlYzJ9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBpbnZlcnNlKG91dCwgYSkge1xuICBvdXRbMF0gPSAxLjAgLyBhWzBdO1xuICBvdXRbMV0gPSAxLjAgLyBhWzFdO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIE5vcm1hbGl6ZSBhIHZlYzJcclxuICpcclxuICogQHBhcmFtIHt2ZWMyfSBvdXQgdGhlIHJlY2VpdmluZyB2ZWN0b3JcclxuICogQHBhcmFtIHt2ZWMyfSBhIHZlY3RvciB0byBub3JtYWxpemVcclxuICogQHJldHVybnMge3ZlYzJ9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBub3JtYWxpemUob3V0LCBhKSB7XG4gIHZhciB4ID0gYVswXSxcbiAgICAgIHkgPSBhWzFdO1xuICB2YXIgbGVuID0geCAqIHggKyB5ICogeTtcblxuICBpZiAobGVuID4gMCkge1xuICAgIC8vVE9ETzogZXZhbHVhdGUgdXNlIG9mIGdsbV9pbnZzcXJ0IGhlcmU/XG4gICAgbGVuID0gMSAvIE1hdGguc3FydChsZW4pO1xuICB9XG5cbiAgb3V0WzBdID0gYVswXSAqIGxlbjtcbiAgb3V0WzFdID0gYVsxXSAqIGxlbjtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBDYWxjdWxhdGVzIHRoZSBkb3QgcHJvZHVjdCBvZiB0d28gdmVjMidzXHJcbiAqXHJcbiAqIEBwYXJhbSB7dmVjMn0gYSB0aGUgZmlyc3Qgb3BlcmFuZFxyXG4gKiBAcGFyYW0ge3ZlYzJ9IGIgdGhlIHNlY29uZCBvcGVyYW5kXHJcbiAqIEByZXR1cm5zIHtOdW1iZXJ9IGRvdCBwcm9kdWN0IG9mIGEgYW5kIGJcclxuICovXG5cblxuZnVuY3Rpb24gZG90KGEsIGIpIHtcbiAgcmV0dXJuIGFbMF0gKiBiWzBdICsgYVsxXSAqIGJbMV07XG59XG4vKipcclxuICogQ29tcHV0ZXMgdGhlIGNyb3NzIHByb2R1Y3Qgb2YgdHdvIHZlYzInc1xyXG4gKiBOb3RlIHRoYXQgdGhlIGNyb3NzIHByb2R1Y3QgbXVzdCBieSBkZWZpbml0aW9uIHByb2R1Y2UgYSAzRCB2ZWN0b3JcclxuICpcclxuICogQHBhcmFtIHt2ZWMzfSBvdXQgdGhlIHJlY2VpdmluZyB2ZWN0b3JcclxuICogQHBhcmFtIHt2ZWMyfSBhIHRoZSBmaXJzdCBvcGVyYW5kXHJcbiAqIEBwYXJhbSB7dmVjMn0gYiB0aGUgc2Vjb25kIG9wZXJhbmRcclxuICogQHJldHVybnMge3ZlYzN9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBjcm9zcyhvdXQsIGEsIGIpIHtcbiAgdmFyIHogPSBhWzBdICogYlsxXSAtIGFbMV0gKiBiWzBdO1xuICBvdXRbMF0gPSBvdXRbMV0gPSAwO1xuICBvdXRbMl0gPSB6O1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIFBlcmZvcm1zIGEgbGluZWFyIGludGVycG9sYXRpb24gYmV0d2VlbiB0d28gdmVjMidzXHJcbiAqXHJcbiAqIEBwYXJhbSB7dmVjMn0gb3V0IHRoZSByZWNlaXZpbmcgdmVjdG9yXHJcbiAqIEBwYXJhbSB7dmVjMn0gYSB0aGUgZmlyc3Qgb3BlcmFuZFxyXG4gKiBAcGFyYW0ge3ZlYzJ9IGIgdGhlIHNlY29uZCBvcGVyYW5kXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSB0IGludGVycG9sYXRpb24gYW1vdW50LCBpbiB0aGUgcmFuZ2UgWzAtMV0sIGJldHdlZW4gdGhlIHR3byBpbnB1dHNcclxuICogQHJldHVybnMge3ZlYzJ9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBsZXJwKG91dCwgYSwgYiwgdCkge1xuICB2YXIgYXggPSBhWzBdLFxuICAgICAgYXkgPSBhWzFdO1xuICBvdXRbMF0gPSBheCArIHQgKiAoYlswXSAtIGF4KTtcbiAgb3V0WzFdID0gYXkgKyB0ICogKGJbMV0gLSBheSk7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogR2VuZXJhdGVzIGEgcmFuZG9tIHZlY3RvciB3aXRoIHRoZSBnaXZlbiBzY2FsZVxyXG4gKlxyXG4gKiBAcGFyYW0ge3ZlYzJ9IG91dCB0aGUgcmVjZWl2aW5nIHZlY3RvclxyXG4gKiBAcGFyYW0ge051bWJlcn0gW3NjYWxlXSBMZW5ndGggb2YgdGhlIHJlc3VsdGluZyB2ZWN0b3IuIElmIG9tbWl0dGVkLCBhIHVuaXQgdmVjdG9yIHdpbGwgYmUgcmV0dXJuZWRcclxuICogQHJldHVybnMge3ZlYzJ9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiByYW5kb20ob3V0LCBzY2FsZSkge1xuICBzY2FsZSA9IHNjYWxlIHx8IDEuMDtcbiAgdmFyIHIgPSBnbE1hdHJpeC5SQU5ET00oKSAqIDIuMCAqIE1hdGguUEk7XG4gIG91dFswXSA9IE1hdGguY29zKHIpICogc2NhbGU7XG4gIG91dFsxXSA9IE1hdGguc2luKHIpICogc2NhbGU7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogVHJhbnNmb3JtcyB0aGUgdmVjMiB3aXRoIGEgbWF0MlxyXG4gKlxyXG4gKiBAcGFyYW0ge3ZlYzJ9IG91dCB0aGUgcmVjZWl2aW5nIHZlY3RvclxyXG4gKiBAcGFyYW0ge3ZlYzJ9IGEgdGhlIHZlY3RvciB0byB0cmFuc2Zvcm1cclxuICogQHBhcmFtIHttYXQyfSBtIG1hdHJpeCB0byB0cmFuc2Zvcm0gd2l0aFxyXG4gKiBAcmV0dXJucyB7dmVjMn0gb3V0XHJcbiAqL1xuXG5cbmZ1bmN0aW9uIHRyYW5zZm9ybU1hdDIob3V0LCBhLCBtKSB7XG4gIHZhciB4ID0gYVswXSxcbiAgICAgIHkgPSBhWzFdO1xuICBvdXRbMF0gPSBtWzBdICogeCArIG1bMl0gKiB5O1xuICBvdXRbMV0gPSBtWzFdICogeCArIG1bM10gKiB5O1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIFRyYW5zZm9ybXMgdGhlIHZlYzIgd2l0aCBhIG1hdDJkXHJcbiAqXHJcbiAqIEBwYXJhbSB7dmVjMn0gb3V0IHRoZSByZWNlaXZpbmcgdmVjdG9yXHJcbiAqIEBwYXJhbSB7dmVjMn0gYSB0aGUgdmVjdG9yIHRvIHRyYW5zZm9ybVxyXG4gKiBAcGFyYW0ge21hdDJkfSBtIG1hdHJpeCB0byB0cmFuc2Zvcm0gd2l0aFxyXG4gKiBAcmV0dXJucyB7dmVjMn0gb3V0XHJcbiAqL1xuXG5cbmZ1bmN0aW9uIHRyYW5zZm9ybU1hdDJkKG91dCwgYSwgbSkge1xuICB2YXIgeCA9IGFbMF0sXG4gICAgICB5ID0gYVsxXTtcbiAgb3V0WzBdID0gbVswXSAqIHggKyBtWzJdICogeSArIG1bNF07XG4gIG91dFsxXSA9IG1bMV0gKiB4ICsgbVszXSAqIHkgKyBtWzVdO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIFRyYW5zZm9ybXMgdGhlIHZlYzIgd2l0aCBhIG1hdDNcclxuICogM3JkIHZlY3RvciBjb21wb25lbnQgaXMgaW1wbGljaXRseSAnMSdcclxuICpcclxuICogQHBhcmFtIHt2ZWMyfSBvdXQgdGhlIHJlY2VpdmluZyB2ZWN0b3JcclxuICogQHBhcmFtIHt2ZWMyfSBhIHRoZSB2ZWN0b3IgdG8gdHJhbnNmb3JtXHJcbiAqIEBwYXJhbSB7bWF0M30gbSBtYXRyaXggdG8gdHJhbnNmb3JtIHdpdGhcclxuICogQHJldHVybnMge3ZlYzJ9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiB0cmFuc2Zvcm1NYXQzKG91dCwgYSwgbSkge1xuICB2YXIgeCA9IGFbMF0sXG4gICAgICB5ID0gYVsxXTtcbiAgb3V0WzBdID0gbVswXSAqIHggKyBtWzNdICogeSArIG1bNl07XG4gIG91dFsxXSA9IG1bMV0gKiB4ICsgbVs0XSAqIHkgKyBtWzddO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIFRyYW5zZm9ybXMgdGhlIHZlYzIgd2l0aCBhIG1hdDRcclxuICogM3JkIHZlY3RvciBjb21wb25lbnQgaXMgaW1wbGljaXRseSAnMCdcclxuICogNHRoIHZlY3RvciBjb21wb25lbnQgaXMgaW1wbGljaXRseSAnMSdcclxuICpcclxuICogQHBhcmFtIHt2ZWMyfSBvdXQgdGhlIHJlY2VpdmluZyB2ZWN0b3JcclxuICogQHBhcmFtIHt2ZWMyfSBhIHRoZSB2ZWN0b3IgdG8gdHJhbnNmb3JtXHJcbiAqIEBwYXJhbSB7bWF0NH0gbSBtYXRyaXggdG8gdHJhbnNmb3JtIHdpdGhcclxuICogQHJldHVybnMge3ZlYzJ9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiB0cmFuc2Zvcm1NYXQ0KG91dCwgYSwgbSkge1xuICB2YXIgeCA9IGFbMF07XG4gIHZhciB5ID0gYVsxXTtcbiAgb3V0WzBdID0gbVswXSAqIHggKyBtWzRdICogeSArIG1bMTJdO1xuICBvdXRbMV0gPSBtWzFdICogeCArIG1bNV0gKiB5ICsgbVsxM107XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogUm90YXRlIGEgMkQgdmVjdG9yXHJcbiAqIEBwYXJhbSB7dmVjMn0gb3V0IFRoZSByZWNlaXZpbmcgdmVjMlxyXG4gKiBAcGFyYW0ge3ZlYzJ9IGEgVGhlIHZlYzIgcG9pbnQgdG8gcm90YXRlXHJcbiAqIEBwYXJhbSB7dmVjMn0gYiBUaGUgb3JpZ2luIG9mIHRoZSByb3RhdGlvblxyXG4gKiBAcGFyYW0ge051bWJlcn0gcmFkIFRoZSBhbmdsZSBvZiByb3RhdGlvbiBpbiByYWRpYW5zXHJcbiAqIEByZXR1cm5zIHt2ZWMyfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gcm90YXRlKG91dCwgYSwgYiwgcmFkKSB7XG4gIC8vVHJhbnNsYXRlIHBvaW50IHRvIHRoZSBvcmlnaW5cbiAgdmFyIHAwID0gYVswXSAtIGJbMF0sXG4gICAgICBwMSA9IGFbMV0gLSBiWzFdLFxuICAgICAgc2luQyA9IE1hdGguc2luKHJhZCksXG4gICAgICBjb3NDID0gTWF0aC5jb3MocmFkKTsgLy9wZXJmb3JtIHJvdGF0aW9uIGFuZCB0cmFuc2xhdGUgdG8gY29ycmVjdCBwb3NpdGlvblxuXG4gIG91dFswXSA9IHAwICogY29zQyAtIHAxICogc2luQyArIGJbMF07XG4gIG91dFsxXSA9IHAwICogc2luQyArIHAxICogY29zQyArIGJbMV07XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogR2V0IHRoZSBhbmdsZSBiZXR3ZWVuIHR3byAyRCB2ZWN0b3JzXHJcbiAqIEBwYXJhbSB7dmVjMn0gYSBUaGUgZmlyc3Qgb3BlcmFuZFxyXG4gKiBAcGFyYW0ge3ZlYzJ9IGIgVGhlIHNlY29uZCBvcGVyYW5kXHJcbiAqIEByZXR1cm5zIHtOdW1iZXJ9IFRoZSBhbmdsZSBpbiByYWRpYW5zXHJcbiAqL1xuXG5cbmZ1bmN0aW9uIGFuZ2xlKGEsIGIpIHtcbiAgdmFyIHgxID0gYVswXSxcbiAgICAgIHkxID0gYVsxXSxcbiAgICAgIHgyID0gYlswXSxcbiAgICAgIHkyID0gYlsxXSxcbiAgICAgIC8vIG1hZyBpcyB0aGUgcHJvZHVjdCBvZiB0aGUgbWFnbml0dWRlcyBvZiBhIGFuZCBiXG4gIG1hZyA9IE1hdGguc3FydCh4MSAqIHgxICsgeTEgKiB5MSkgKiBNYXRoLnNxcnQoeDIgKiB4MiArIHkyICogeTIpLFxuICAgICAgLy8gbWFnICYmLi4gc2hvcnQgY2lyY3VpdHMgaWYgbWFnID09IDBcbiAgY29zaW5lID0gbWFnICYmICh4MSAqIHgyICsgeTEgKiB5MikgLyBtYWc7IC8vIE1hdGgubWluKE1hdGgubWF4KGNvc2luZSwgLTEpLCAxKSBjbGFtcHMgdGhlIGNvc2luZSBiZXR3ZWVuIC0xIGFuZCAxXG5cbiAgcmV0dXJuIE1hdGguYWNvcyhNYXRoLm1pbihNYXRoLm1heChjb3NpbmUsIC0xKSwgMSkpO1xufVxuLyoqXHJcbiAqIFNldCB0aGUgY29tcG9uZW50cyBvZiBhIHZlYzIgdG8gemVyb1xyXG4gKlxyXG4gKiBAcGFyYW0ge3ZlYzJ9IG91dCB0aGUgcmVjZWl2aW5nIHZlY3RvclxyXG4gKiBAcmV0dXJucyB7dmVjMn0gb3V0XHJcbiAqL1xuXG5cbmZ1bmN0aW9uIHplcm8ob3V0KSB7XG4gIG91dFswXSA9IDAuMDtcbiAgb3V0WzFdID0gMC4wO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIFJldHVybnMgYSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgYSB2ZWN0b3JcclxuICpcclxuICogQHBhcmFtIHt2ZWMyfSBhIHZlY3RvciB0byByZXByZXNlbnQgYXMgYSBzdHJpbmdcclxuICogQHJldHVybnMge1N0cmluZ30gc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIHRoZSB2ZWN0b3JcclxuICovXG5cblxuZnVuY3Rpb24gc3RyKGEpIHtcbiAgcmV0dXJuIFwidmVjMihcIiArIGFbMF0gKyBcIiwgXCIgKyBhWzFdICsgXCIpXCI7XG59XG4vKipcclxuICogUmV0dXJucyB3aGV0aGVyIG9yIG5vdCB0aGUgdmVjdG9ycyBleGFjdGx5IGhhdmUgdGhlIHNhbWUgZWxlbWVudHMgaW4gdGhlIHNhbWUgcG9zaXRpb24gKHdoZW4gY29tcGFyZWQgd2l0aCA9PT0pXHJcbiAqXHJcbiAqIEBwYXJhbSB7dmVjMn0gYSBUaGUgZmlyc3QgdmVjdG9yLlxyXG4gKiBAcGFyYW0ge3ZlYzJ9IGIgVGhlIHNlY29uZCB2ZWN0b3IuXHJcbiAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIHRoZSB2ZWN0b3JzIGFyZSBlcXVhbCwgZmFsc2Ugb3RoZXJ3aXNlLlxyXG4gKi9cblxuXG5mdW5jdGlvbiBleGFjdEVxdWFscyhhLCBiKSB7XG4gIHJldHVybiBhWzBdID09PSBiWzBdICYmIGFbMV0gPT09IGJbMV07XG59XG4vKipcclxuICogUmV0dXJucyB3aGV0aGVyIG9yIG5vdCB0aGUgdmVjdG9ycyBoYXZlIGFwcHJveGltYXRlbHkgdGhlIHNhbWUgZWxlbWVudHMgaW4gdGhlIHNhbWUgcG9zaXRpb24uXHJcbiAqXHJcbiAqIEBwYXJhbSB7dmVjMn0gYSBUaGUgZmlyc3QgdmVjdG9yLlxyXG4gKiBAcGFyYW0ge3ZlYzJ9IGIgVGhlIHNlY29uZCB2ZWN0b3IuXHJcbiAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIHRoZSB2ZWN0b3JzIGFyZSBlcXVhbCwgZmFsc2Ugb3RoZXJ3aXNlLlxyXG4gKi9cblxuXG5mdW5jdGlvbiBlcXVhbHMoYSwgYikge1xuICB2YXIgYTAgPSBhWzBdLFxuICAgICAgYTEgPSBhWzFdO1xuICB2YXIgYjAgPSBiWzBdLFxuICAgICAgYjEgPSBiWzFdO1xuICByZXR1cm4gTWF0aC5hYnMoYTAgLSBiMCkgPD0gZ2xNYXRyaXguRVBTSUxPTiAqIE1hdGgubWF4KDEuMCwgTWF0aC5hYnMoYTApLCBNYXRoLmFicyhiMCkpICYmIE1hdGguYWJzKGExIC0gYjEpIDw9IGdsTWF0cml4LkVQU0lMT04gKiBNYXRoLm1heCgxLjAsIE1hdGguYWJzKGExKSwgTWF0aC5hYnMoYjEpKTtcbn1cbi8qKlxyXG4gKiBBbGlhcyBmb3Ige0BsaW5rIHZlYzIubGVuZ3RofVxyXG4gKiBAZnVuY3Rpb25cclxuICovXG5cblxudmFyIGxlbiA9IGxlbmd0aDtcbi8qKlxyXG4gKiBBbGlhcyBmb3Ige0BsaW5rIHZlYzIuc3VidHJhY3R9XHJcbiAqIEBmdW5jdGlvblxyXG4gKi9cblxuZXhwb3J0cy5sZW4gPSBsZW47XG52YXIgc3ViID0gc3VidHJhY3Q7XG4vKipcclxuICogQWxpYXMgZm9yIHtAbGluayB2ZWMyLm11bHRpcGx5fVxyXG4gKiBAZnVuY3Rpb25cclxuICovXG5cbmV4cG9ydHMuc3ViID0gc3ViO1xudmFyIG11bCA9IG11bHRpcGx5O1xuLyoqXHJcbiAqIEFsaWFzIGZvciB7QGxpbmsgdmVjMi5kaXZpZGV9XHJcbiAqIEBmdW5jdGlvblxyXG4gKi9cblxuZXhwb3J0cy5tdWwgPSBtdWw7XG52YXIgZGl2ID0gZGl2aWRlO1xuLyoqXHJcbiAqIEFsaWFzIGZvciB7QGxpbmsgdmVjMi5kaXN0YW5jZX1cclxuICogQGZ1bmN0aW9uXHJcbiAqL1xuXG5leHBvcnRzLmRpdiA9IGRpdjtcbnZhciBkaXN0ID0gZGlzdGFuY2U7XG4vKipcclxuICogQWxpYXMgZm9yIHtAbGluayB2ZWMyLnNxdWFyZWREaXN0YW5jZX1cclxuICogQGZ1bmN0aW9uXHJcbiAqL1xuXG5leHBvcnRzLmRpc3QgPSBkaXN0O1xudmFyIHNxckRpc3QgPSBzcXVhcmVkRGlzdGFuY2U7XG4vKipcclxuICogQWxpYXMgZm9yIHtAbGluayB2ZWMyLnNxdWFyZWRMZW5ndGh9XHJcbiAqIEBmdW5jdGlvblxyXG4gKi9cblxuZXhwb3J0cy5zcXJEaXN0ID0gc3FyRGlzdDtcbnZhciBzcXJMZW4gPSBzcXVhcmVkTGVuZ3RoO1xuLyoqXHJcbiAqIFBlcmZvcm0gc29tZSBvcGVyYXRpb24gb3ZlciBhbiBhcnJheSBvZiB2ZWMycy5cclxuICpcclxuICogQHBhcmFtIHtBcnJheX0gYSB0aGUgYXJyYXkgb2YgdmVjdG9ycyB0byBpdGVyYXRlIG92ZXJcclxuICogQHBhcmFtIHtOdW1iZXJ9IHN0cmlkZSBOdW1iZXIgb2YgZWxlbWVudHMgYmV0d2VlbiB0aGUgc3RhcnQgb2YgZWFjaCB2ZWMyLiBJZiAwIGFzc3VtZXMgdGlnaHRseSBwYWNrZWRcclxuICogQHBhcmFtIHtOdW1iZXJ9IG9mZnNldCBOdW1iZXIgb2YgZWxlbWVudHMgdG8gc2tpcCBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSBhcnJheVxyXG4gKiBAcGFyYW0ge051bWJlcn0gY291bnQgTnVtYmVyIG9mIHZlYzJzIHRvIGl0ZXJhdGUgb3Zlci4gSWYgMCBpdGVyYXRlcyBvdmVyIGVudGlyZSBhcnJheVxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBGdW5jdGlvbiB0byBjYWxsIGZvciBlYWNoIHZlY3RvciBpbiB0aGUgYXJyYXlcclxuICogQHBhcmFtIHtPYmplY3R9IFthcmddIGFkZGl0aW9uYWwgYXJndW1lbnQgdG8gcGFzcyB0byBmblxyXG4gKiBAcmV0dXJucyB7QXJyYXl9IGFcclxuICogQGZ1bmN0aW9uXHJcbiAqL1xuXG5leHBvcnRzLnNxckxlbiA9IHNxckxlbjtcblxudmFyIGZvckVhY2ggPSBmdW5jdGlvbiAoKSB7XG4gIHZhciB2ZWMgPSBjcmVhdGUoKTtcbiAgcmV0dXJuIGZ1bmN0aW9uIChhLCBzdHJpZGUsIG9mZnNldCwgY291bnQsIGZuLCBhcmcpIHtcbiAgICB2YXIgaSwgbDtcblxuICAgIGlmICghc3RyaWRlKSB7XG4gICAgICBzdHJpZGUgPSAyO1xuICAgIH1cblxuICAgIGlmICghb2Zmc2V0KSB7XG4gICAgICBvZmZzZXQgPSAwO1xuICAgIH1cblxuICAgIGlmIChjb3VudCkge1xuICAgICAgbCA9IE1hdGgubWluKGNvdW50ICogc3RyaWRlICsgb2Zmc2V0LCBhLmxlbmd0aCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGwgPSBhLmxlbmd0aDtcbiAgICB9XG5cbiAgICBmb3IgKGkgPSBvZmZzZXQ7IGkgPCBsOyBpICs9IHN0cmlkZSkge1xuICAgICAgdmVjWzBdID0gYVtpXTtcbiAgICAgIHZlY1sxXSA9IGFbaSArIDFdO1xuICAgICAgZm4odmVjLCB2ZWMsIGFyZyk7XG4gICAgICBhW2ldID0gdmVjWzBdO1xuICAgICAgYVtpICsgMV0gPSB2ZWNbMV07XG4gICAgfVxuXG4gICAgcmV0dXJuIGE7XG4gIH07XG59KCk7XG5cbmV4cG9ydHMuZm9yRWFjaCA9IGZvckVhY2g7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IFwiQGJhYmVsL2hlbHBlcnMgLSB0eXBlb2ZcIjsgaWYgKHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiB0eXBlb2YgU3ltYm9sLml0ZXJhdG9yID09PSBcInN5bWJvbFwiKSB7IF90eXBlb2YgPSBmdW5jdGlvbiBfdHlwZW9mKG9iaikgeyByZXR1cm4gdHlwZW9mIG9iajsgfTsgfSBlbHNlIHsgX3R5cGVvZiA9IGZ1bmN0aW9uIF90eXBlb2Yob2JqKSB7IHJldHVybiBvYmogJiYgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9iai5jb25zdHJ1Y3RvciA9PT0gU3ltYm9sICYmIG9iaiAhPT0gU3ltYm9sLnByb3RvdHlwZSA/IFwic3ltYm9sXCIgOiB0eXBlb2Ygb2JqOyB9OyB9IHJldHVybiBfdHlwZW9mKG9iaik7IH1cblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuY3JlYXRlID0gY3JlYXRlO1xuZXhwb3J0cy5jbG9uZSA9IGNsb25lO1xuZXhwb3J0cy5sZW5ndGggPSBsZW5ndGg7XG5leHBvcnRzLmZyb21WYWx1ZXMgPSBmcm9tVmFsdWVzO1xuZXhwb3J0cy5jb3B5ID0gY29weTtcbmV4cG9ydHMuc2V0ID0gc2V0O1xuZXhwb3J0cy5hZGQgPSBhZGQ7XG5leHBvcnRzLnN1YnRyYWN0ID0gc3VidHJhY3Q7XG5leHBvcnRzLm11bHRpcGx5ID0gbXVsdGlwbHk7XG5leHBvcnRzLmRpdmlkZSA9IGRpdmlkZTtcbmV4cG9ydHMuY2VpbCA9IGNlaWw7XG5leHBvcnRzLmZsb29yID0gZmxvb3I7XG5leHBvcnRzLm1pbiA9IG1pbjtcbmV4cG9ydHMubWF4ID0gbWF4O1xuZXhwb3J0cy5yb3VuZCA9IHJvdW5kO1xuZXhwb3J0cy5zY2FsZSA9IHNjYWxlO1xuZXhwb3J0cy5zY2FsZUFuZEFkZCA9IHNjYWxlQW5kQWRkO1xuZXhwb3J0cy5kaXN0YW5jZSA9IGRpc3RhbmNlO1xuZXhwb3J0cy5zcXVhcmVkRGlzdGFuY2UgPSBzcXVhcmVkRGlzdGFuY2U7XG5leHBvcnRzLnNxdWFyZWRMZW5ndGggPSBzcXVhcmVkTGVuZ3RoO1xuZXhwb3J0cy5uZWdhdGUgPSBuZWdhdGU7XG5leHBvcnRzLmludmVyc2UgPSBpbnZlcnNlO1xuZXhwb3J0cy5ub3JtYWxpemUgPSBub3JtYWxpemU7XG5leHBvcnRzLmRvdCA9IGRvdDtcbmV4cG9ydHMuY3Jvc3MgPSBjcm9zcztcbmV4cG9ydHMubGVycCA9IGxlcnA7XG5leHBvcnRzLmhlcm1pdGUgPSBoZXJtaXRlO1xuZXhwb3J0cy5iZXppZXIgPSBiZXppZXI7XG5leHBvcnRzLnJhbmRvbSA9IHJhbmRvbTtcbmV4cG9ydHMudHJhbnNmb3JtTWF0NCA9IHRyYW5zZm9ybU1hdDQ7XG5leHBvcnRzLnRyYW5zZm9ybU1hdDMgPSB0cmFuc2Zvcm1NYXQzO1xuZXhwb3J0cy50cmFuc2Zvcm1RdWF0ID0gdHJhbnNmb3JtUXVhdDtcbmV4cG9ydHMucm90YXRlWCA9IHJvdGF0ZVg7XG5leHBvcnRzLnJvdGF0ZVkgPSByb3RhdGVZO1xuZXhwb3J0cy5yb3RhdGVaID0gcm90YXRlWjtcbmV4cG9ydHMuYW5nbGUgPSBhbmdsZTtcbmV4cG9ydHMuemVybyA9IHplcm87XG5leHBvcnRzLnN0ciA9IHN0cjtcbmV4cG9ydHMuZXhhY3RFcXVhbHMgPSBleGFjdEVxdWFscztcbmV4cG9ydHMuZXF1YWxzID0gZXF1YWxzO1xuZXhwb3J0cy5mb3JFYWNoID0gZXhwb3J0cy5zcXJMZW4gPSBleHBvcnRzLmxlbiA9IGV4cG9ydHMuc3FyRGlzdCA9IGV4cG9ydHMuZGlzdCA9IGV4cG9ydHMuZGl2ID0gZXhwb3J0cy5tdWwgPSBleHBvcnRzLnN1YiA9IHZvaWQgMDtcblxudmFyIGdsTWF0cml4ID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQocmVxdWlyZShcIi4vY29tbW9uLmpzXCIpKTtcblxuZnVuY3Rpb24gX2dldFJlcXVpcmVXaWxkY2FyZENhY2hlKCkgeyBpZiAodHlwZW9mIFdlYWtNYXAgIT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIG51bGw7IHZhciBjYWNoZSA9IG5ldyBXZWFrTWFwKCk7IF9nZXRSZXF1aXJlV2lsZGNhcmRDYWNoZSA9IGZ1bmN0aW9uIF9nZXRSZXF1aXJlV2lsZGNhcmRDYWNoZSgpIHsgcmV0dXJuIGNhY2hlOyB9OyByZXR1cm4gY2FjaGU7IH1cblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQob2JqKSB7IGlmIChvYmogJiYgb2JqLl9fZXNNb2R1bGUpIHsgcmV0dXJuIG9iajsgfSBpZiAob2JqID09PSBudWxsIHx8IF90eXBlb2Yob2JqKSAhPT0gXCJvYmplY3RcIiAmJiB0eXBlb2Ygb2JqICE9PSBcImZ1bmN0aW9uXCIpIHsgcmV0dXJuIHsgXCJkZWZhdWx0XCI6IG9iaiB9OyB9IHZhciBjYWNoZSA9IF9nZXRSZXF1aXJlV2lsZGNhcmRDYWNoZSgpOyBpZiAoY2FjaGUgJiYgY2FjaGUuaGFzKG9iaikpIHsgcmV0dXJuIGNhY2hlLmdldChvYmopOyB9IHZhciBuZXdPYmogPSB7fTsgdmFyIGhhc1Byb3BlcnR5RGVzY3JpcHRvciA9IE9iamVjdC5kZWZpbmVQcm9wZXJ0eSAmJiBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yOyBmb3IgKHZhciBrZXkgaW4gb2JqKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpKSB7IHZhciBkZXNjID0gaGFzUHJvcGVydHlEZXNjcmlwdG9yID8gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmosIGtleSkgOiBudWxsOyBpZiAoZGVzYyAmJiAoZGVzYy5nZXQgfHwgZGVzYy5zZXQpKSB7IE9iamVjdC5kZWZpbmVQcm9wZXJ0eShuZXdPYmosIGtleSwgZGVzYyk7IH0gZWxzZSB7IG5ld09ialtrZXldID0gb2JqW2tleV07IH0gfSB9IG5ld09ialtcImRlZmF1bHRcIl0gPSBvYmo7IGlmIChjYWNoZSkgeyBjYWNoZS5zZXQob2JqLCBuZXdPYmopOyB9IHJldHVybiBuZXdPYmo7IH1cblxuLyoqXHJcbiAqIDMgRGltZW5zaW9uYWwgVmVjdG9yXHJcbiAqIEBtb2R1bGUgdmVjM1xyXG4gKi9cblxuLyoqXHJcbiAqIENyZWF0ZXMgYSBuZXcsIGVtcHR5IHZlYzNcclxuICpcclxuICogQHJldHVybnMge3ZlYzN9IGEgbmV3IDNEIHZlY3RvclxyXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZSgpIHtcbiAgdmFyIG91dCA9IG5ldyBnbE1hdHJpeC5BUlJBWV9UWVBFKDMpO1xuXG4gIGlmIChnbE1hdHJpeC5BUlJBWV9UWVBFICE9IEZsb2F0MzJBcnJheSkge1xuICAgIG91dFswXSA9IDA7XG4gICAgb3V0WzFdID0gMDtcbiAgICBvdXRbMl0gPSAwO1xuICB9XG5cbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBDcmVhdGVzIGEgbmV3IHZlYzMgaW5pdGlhbGl6ZWQgd2l0aCB2YWx1ZXMgZnJvbSBhbiBleGlzdGluZyB2ZWN0b3JcclxuICpcclxuICogQHBhcmFtIHt2ZWMzfSBhIHZlY3RvciB0byBjbG9uZVxyXG4gKiBAcmV0dXJucyB7dmVjM30gYSBuZXcgM0QgdmVjdG9yXHJcbiAqL1xuXG5cbmZ1bmN0aW9uIGNsb25lKGEpIHtcbiAgdmFyIG91dCA9IG5ldyBnbE1hdHJpeC5BUlJBWV9UWVBFKDMpO1xuICBvdXRbMF0gPSBhWzBdO1xuICBvdXRbMV0gPSBhWzFdO1xuICBvdXRbMl0gPSBhWzJdO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIENhbGN1bGF0ZXMgdGhlIGxlbmd0aCBvZiBhIHZlYzNcclxuICpcclxuICogQHBhcmFtIHt2ZWMzfSBhIHZlY3RvciB0byBjYWxjdWxhdGUgbGVuZ3RoIG9mXHJcbiAqIEByZXR1cm5zIHtOdW1iZXJ9IGxlbmd0aCBvZiBhXHJcbiAqL1xuXG5cbmZ1bmN0aW9uIGxlbmd0aChhKSB7XG4gIHZhciB4ID0gYVswXTtcbiAgdmFyIHkgPSBhWzFdO1xuICB2YXIgeiA9IGFbMl07XG4gIHJldHVybiBNYXRoLmh5cG90KHgsIHksIHopO1xufVxuLyoqXHJcbiAqIENyZWF0ZXMgYSBuZXcgdmVjMyBpbml0aWFsaXplZCB3aXRoIHRoZSBnaXZlbiB2YWx1ZXNcclxuICpcclxuICogQHBhcmFtIHtOdW1iZXJ9IHggWCBjb21wb25lbnRcclxuICogQHBhcmFtIHtOdW1iZXJ9IHkgWSBjb21wb25lbnRcclxuICogQHBhcmFtIHtOdW1iZXJ9IHogWiBjb21wb25lbnRcclxuICogQHJldHVybnMge3ZlYzN9IGEgbmV3IDNEIHZlY3RvclxyXG4gKi9cblxuXG5mdW5jdGlvbiBmcm9tVmFsdWVzKHgsIHksIHopIHtcbiAgdmFyIG91dCA9IG5ldyBnbE1hdHJpeC5BUlJBWV9UWVBFKDMpO1xuICBvdXRbMF0gPSB4O1xuICBvdXRbMV0gPSB5O1xuICBvdXRbMl0gPSB6O1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIENvcHkgdGhlIHZhbHVlcyBmcm9tIG9uZSB2ZWMzIHRvIGFub3RoZXJcclxuICpcclxuICogQHBhcmFtIHt2ZWMzfSBvdXQgdGhlIHJlY2VpdmluZyB2ZWN0b3JcclxuICogQHBhcmFtIHt2ZWMzfSBhIHRoZSBzb3VyY2UgdmVjdG9yXHJcbiAqIEByZXR1cm5zIHt2ZWMzfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gY29weShvdXQsIGEpIHtcbiAgb3V0WzBdID0gYVswXTtcbiAgb3V0WzFdID0gYVsxXTtcbiAgb3V0WzJdID0gYVsyXTtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBTZXQgdGhlIGNvbXBvbmVudHMgb2YgYSB2ZWMzIHRvIHRoZSBnaXZlbiB2YWx1ZXNcclxuICpcclxuICogQHBhcmFtIHt2ZWMzfSBvdXQgdGhlIHJlY2VpdmluZyB2ZWN0b3JcclxuICogQHBhcmFtIHtOdW1iZXJ9IHggWCBjb21wb25lbnRcclxuICogQHBhcmFtIHtOdW1iZXJ9IHkgWSBjb21wb25lbnRcclxuICogQHBhcmFtIHtOdW1iZXJ9IHogWiBjb21wb25lbnRcclxuICogQHJldHVybnMge3ZlYzN9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBzZXQob3V0LCB4LCB5LCB6KSB7XG4gIG91dFswXSA9IHg7XG4gIG91dFsxXSA9IHk7XG4gIG91dFsyXSA9IHo7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogQWRkcyB0d28gdmVjMydzXHJcbiAqXHJcbiAqIEBwYXJhbSB7dmVjM30gb3V0IHRoZSByZWNlaXZpbmcgdmVjdG9yXHJcbiAqIEBwYXJhbSB7dmVjM30gYSB0aGUgZmlyc3Qgb3BlcmFuZFxyXG4gKiBAcGFyYW0ge3ZlYzN9IGIgdGhlIHNlY29uZCBvcGVyYW5kXHJcbiAqIEByZXR1cm5zIHt2ZWMzfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gYWRkKG91dCwgYSwgYikge1xuICBvdXRbMF0gPSBhWzBdICsgYlswXTtcbiAgb3V0WzFdID0gYVsxXSArIGJbMV07XG4gIG91dFsyXSA9IGFbMl0gKyBiWzJdO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIFN1YnRyYWN0cyB2ZWN0b3IgYiBmcm9tIHZlY3RvciBhXHJcbiAqXHJcbiAqIEBwYXJhbSB7dmVjM30gb3V0IHRoZSByZWNlaXZpbmcgdmVjdG9yXHJcbiAqIEBwYXJhbSB7dmVjM30gYSB0aGUgZmlyc3Qgb3BlcmFuZFxyXG4gKiBAcGFyYW0ge3ZlYzN9IGIgdGhlIHNlY29uZCBvcGVyYW5kXHJcbiAqIEByZXR1cm5zIHt2ZWMzfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gc3VidHJhY3Qob3V0LCBhLCBiKSB7XG4gIG91dFswXSA9IGFbMF0gLSBiWzBdO1xuICBvdXRbMV0gPSBhWzFdIC0gYlsxXTtcbiAgb3V0WzJdID0gYVsyXSAtIGJbMl07XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogTXVsdGlwbGllcyB0d28gdmVjMydzXHJcbiAqXHJcbiAqIEBwYXJhbSB7dmVjM30gb3V0IHRoZSByZWNlaXZpbmcgdmVjdG9yXHJcbiAqIEBwYXJhbSB7dmVjM30gYSB0aGUgZmlyc3Qgb3BlcmFuZFxyXG4gKiBAcGFyYW0ge3ZlYzN9IGIgdGhlIHNlY29uZCBvcGVyYW5kXHJcbiAqIEByZXR1cm5zIHt2ZWMzfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gbXVsdGlwbHkob3V0LCBhLCBiKSB7XG4gIG91dFswXSA9IGFbMF0gKiBiWzBdO1xuICBvdXRbMV0gPSBhWzFdICogYlsxXTtcbiAgb3V0WzJdID0gYVsyXSAqIGJbMl07XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogRGl2aWRlcyB0d28gdmVjMydzXHJcbiAqXHJcbiAqIEBwYXJhbSB7dmVjM30gb3V0IHRoZSByZWNlaXZpbmcgdmVjdG9yXHJcbiAqIEBwYXJhbSB7dmVjM30gYSB0aGUgZmlyc3Qgb3BlcmFuZFxyXG4gKiBAcGFyYW0ge3ZlYzN9IGIgdGhlIHNlY29uZCBvcGVyYW5kXHJcbiAqIEByZXR1cm5zIHt2ZWMzfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gZGl2aWRlKG91dCwgYSwgYikge1xuICBvdXRbMF0gPSBhWzBdIC8gYlswXTtcbiAgb3V0WzFdID0gYVsxXSAvIGJbMV07XG4gIG91dFsyXSA9IGFbMl0gLyBiWzJdO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIE1hdGguY2VpbCB0aGUgY29tcG9uZW50cyBvZiBhIHZlYzNcclxuICpcclxuICogQHBhcmFtIHt2ZWMzfSBvdXQgdGhlIHJlY2VpdmluZyB2ZWN0b3JcclxuICogQHBhcmFtIHt2ZWMzfSBhIHZlY3RvciB0byBjZWlsXHJcbiAqIEByZXR1cm5zIHt2ZWMzfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gY2VpbChvdXQsIGEpIHtcbiAgb3V0WzBdID0gTWF0aC5jZWlsKGFbMF0pO1xuICBvdXRbMV0gPSBNYXRoLmNlaWwoYVsxXSk7XG4gIG91dFsyXSA9IE1hdGguY2VpbChhWzJdKTtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBNYXRoLmZsb29yIHRoZSBjb21wb25lbnRzIG9mIGEgdmVjM1xyXG4gKlxyXG4gKiBAcGFyYW0ge3ZlYzN9IG91dCB0aGUgcmVjZWl2aW5nIHZlY3RvclxyXG4gKiBAcGFyYW0ge3ZlYzN9IGEgdmVjdG9yIHRvIGZsb29yXHJcbiAqIEByZXR1cm5zIHt2ZWMzfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gZmxvb3Iob3V0LCBhKSB7XG4gIG91dFswXSA9IE1hdGguZmxvb3IoYVswXSk7XG4gIG91dFsxXSA9IE1hdGguZmxvb3IoYVsxXSk7XG4gIG91dFsyXSA9IE1hdGguZmxvb3IoYVsyXSk7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogUmV0dXJucyB0aGUgbWluaW11bSBvZiB0d28gdmVjMydzXHJcbiAqXHJcbiAqIEBwYXJhbSB7dmVjM30gb3V0IHRoZSByZWNlaXZpbmcgdmVjdG9yXHJcbiAqIEBwYXJhbSB7dmVjM30gYSB0aGUgZmlyc3Qgb3BlcmFuZFxyXG4gKiBAcGFyYW0ge3ZlYzN9IGIgdGhlIHNlY29uZCBvcGVyYW5kXHJcbiAqIEByZXR1cm5zIHt2ZWMzfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gbWluKG91dCwgYSwgYikge1xuICBvdXRbMF0gPSBNYXRoLm1pbihhWzBdLCBiWzBdKTtcbiAgb3V0WzFdID0gTWF0aC5taW4oYVsxXSwgYlsxXSk7XG4gIG91dFsyXSA9IE1hdGgubWluKGFbMl0sIGJbMl0pO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIFJldHVybnMgdGhlIG1heGltdW0gb2YgdHdvIHZlYzMnc1xyXG4gKlxyXG4gKiBAcGFyYW0ge3ZlYzN9IG91dCB0aGUgcmVjZWl2aW5nIHZlY3RvclxyXG4gKiBAcGFyYW0ge3ZlYzN9IGEgdGhlIGZpcnN0IG9wZXJhbmRcclxuICogQHBhcmFtIHt2ZWMzfSBiIHRoZSBzZWNvbmQgb3BlcmFuZFxyXG4gKiBAcmV0dXJucyB7dmVjM30gb3V0XHJcbiAqL1xuXG5cbmZ1bmN0aW9uIG1heChvdXQsIGEsIGIpIHtcbiAgb3V0WzBdID0gTWF0aC5tYXgoYVswXSwgYlswXSk7XG4gIG91dFsxXSA9IE1hdGgubWF4KGFbMV0sIGJbMV0pO1xuICBvdXRbMl0gPSBNYXRoLm1heChhWzJdLCBiWzJdKTtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBNYXRoLnJvdW5kIHRoZSBjb21wb25lbnRzIG9mIGEgdmVjM1xyXG4gKlxyXG4gKiBAcGFyYW0ge3ZlYzN9IG91dCB0aGUgcmVjZWl2aW5nIHZlY3RvclxyXG4gKiBAcGFyYW0ge3ZlYzN9IGEgdmVjdG9yIHRvIHJvdW5kXHJcbiAqIEByZXR1cm5zIHt2ZWMzfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gcm91bmQob3V0LCBhKSB7XG4gIG91dFswXSA9IE1hdGgucm91bmQoYVswXSk7XG4gIG91dFsxXSA9IE1hdGgucm91bmQoYVsxXSk7XG4gIG91dFsyXSA9IE1hdGgucm91bmQoYVsyXSk7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogU2NhbGVzIGEgdmVjMyBieSBhIHNjYWxhciBudW1iZXJcclxuICpcclxuICogQHBhcmFtIHt2ZWMzfSBvdXQgdGhlIHJlY2VpdmluZyB2ZWN0b3JcclxuICogQHBhcmFtIHt2ZWMzfSBhIHRoZSB2ZWN0b3IgdG8gc2NhbGVcclxuICogQHBhcmFtIHtOdW1iZXJ9IGIgYW1vdW50IHRvIHNjYWxlIHRoZSB2ZWN0b3IgYnlcclxuICogQHJldHVybnMge3ZlYzN9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBzY2FsZShvdXQsIGEsIGIpIHtcbiAgb3V0WzBdID0gYVswXSAqIGI7XG4gIG91dFsxXSA9IGFbMV0gKiBiO1xuICBvdXRbMl0gPSBhWzJdICogYjtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBBZGRzIHR3byB2ZWMzJ3MgYWZ0ZXIgc2NhbGluZyB0aGUgc2Vjb25kIG9wZXJhbmQgYnkgYSBzY2FsYXIgdmFsdWVcclxuICpcclxuICogQHBhcmFtIHt2ZWMzfSBvdXQgdGhlIHJlY2VpdmluZyB2ZWN0b3JcclxuICogQHBhcmFtIHt2ZWMzfSBhIHRoZSBmaXJzdCBvcGVyYW5kXHJcbiAqIEBwYXJhbSB7dmVjM30gYiB0aGUgc2Vjb25kIG9wZXJhbmRcclxuICogQHBhcmFtIHtOdW1iZXJ9IHNjYWxlIHRoZSBhbW91bnQgdG8gc2NhbGUgYiBieSBiZWZvcmUgYWRkaW5nXHJcbiAqIEByZXR1cm5zIHt2ZWMzfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gc2NhbGVBbmRBZGQob3V0LCBhLCBiLCBzY2FsZSkge1xuICBvdXRbMF0gPSBhWzBdICsgYlswXSAqIHNjYWxlO1xuICBvdXRbMV0gPSBhWzFdICsgYlsxXSAqIHNjYWxlO1xuICBvdXRbMl0gPSBhWzJdICsgYlsyXSAqIHNjYWxlO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIENhbGN1bGF0ZXMgdGhlIGV1Y2xpZGlhbiBkaXN0YW5jZSBiZXR3ZWVuIHR3byB2ZWMzJ3NcclxuICpcclxuICogQHBhcmFtIHt2ZWMzfSBhIHRoZSBmaXJzdCBvcGVyYW5kXHJcbiAqIEBwYXJhbSB7dmVjM30gYiB0aGUgc2Vjb25kIG9wZXJhbmRcclxuICogQHJldHVybnMge051bWJlcn0gZGlzdGFuY2UgYmV0d2VlbiBhIGFuZCBiXHJcbiAqL1xuXG5cbmZ1bmN0aW9uIGRpc3RhbmNlKGEsIGIpIHtcbiAgdmFyIHggPSBiWzBdIC0gYVswXTtcbiAgdmFyIHkgPSBiWzFdIC0gYVsxXTtcbiAgdmFyIHogPSBiWzJdIC0gYVsyXTtcbiAgcmV0dXJuIE1hdGguaHlwb3QoeCwgeSwgeik7XG59XG4vKipcclxuICogQ2FsY3VsYXRlcyB0aGUgc3F1YXJlZCBldWNsaWRpYW4gZGlzdGFuY2UgYmV0d2VlbiB0d28gdmVjMydzXHJcbiAqXHJcbiAqIEBwYXJhbSB7dmVjM30gYSB0aGUgZmlyc3Qgb3BlcmFuZFxyXG4gKiBAcGFyYW0ge3ZlYzN9IGIgdGhlIHNlY29uZCBvcGVyYW5kXHJcbiAqIEByZXR1cm5zIHtOdW1iZXJ9IHNxdWFyZWQgZGlzdGFuY2UgYmV0d2VlbiBhIGFuZCBiXHJcbiAqL1xuXG5cbmZ1bmN0aW9uIHNxdWFyZWREaXN0YW5jZShhLCBiKSB7XG4gIHZhciB4ID0gYlswXSAtIGFbMF07XG4gIHZhciB5ID0gYlsxXSAtIGFbMV07XG4gIHZhciB6ID0gYlsyXSAtIGFbMl07XG4gIHJldHVybiB4ICogeCArIHkgKiB5ICsgeiAqIHo7XG59XG4vKipcclxuICogQ2FsY3VsYXRlcyB0aGUgc3F1YXJlZCBsZW5ndGggb2YgYSB2ZWMzXHJcbiAqXHJcbiAqIEBwYXJhbSB7dmVjM30gYSB2ZWN0b3IgdG8gY2FsY3VsYXRlIHNxdWFyZWQgbGVuZ3RoIG9mXHJcbiAqIEByZXR1cm5zIHtOdW1iZXJ9IHNxdWFyZWQgbGVuZ3RoIG9mIGFcclxuICovXG5cblxuZnVuY3Rpb24gc3F1YXJlZExlbmd0aChhKSB7XG4gIHZhciB4ID0gYVswXTtcbiAgdmFyIHkgPSBhWzFdO1xuICB2YXIgeiA9IGFbMl07XG4gIHJldHVybiB4ICogeCArIHkgKiB5ICsgeiAqIHo7XG59XG4vKipcclxuICogTmVnYXRlcyB0aGUgY29tcG9uZW50cyBvZiBhIHZlYzNcclxuICpcclxuICogQHBhcmFtIHt2ZWMzfSBvdXQgdGhlIHJlY2VpdmluZyB2ZWN0b3JcclxuICogQHBhcmFtIHt2ZWMzfSBhIHZlY3RvciB0byBuZWdhdGVcclxuICogQHJldHVybnMge3ZlYzN9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBuZWdhdGUob3V0LCBhKSB7XG4gIG91dFswXSA9IC1hWzBdO1xuICBvdXRbMV0gPSAtYVsxXTtcbiAgb3V0WzJdID0gLWFbMl07XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogUmV0dXJucyB0aGUgaW52ZXJzZSBvZiB0aGUgY29tcG9uZW50cyBvZiBhIHZlYzNcclxuICpcclxuICogQHBhcmFtIHt2ZWMzfSBvdXQgdGhlIHJlY2VpdmluZyB2ZWN0b3JcclxuICogQHBhcmFtIHt2ZWMzfSBhIHZlY3RvciB0byBpbnZlcnRcclxuICogQHJldHVybnMge3ZlYzN9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBpbnZlcnNlKG91dCwgYSkge1xuICBvdXRbMF0gPSAxLjAgLyBhWzBdO1xuICBvdXRbMV0gPSAxLjAgLyBhWzFdO1xuICBvdXRbMl0gPSAxLjAgLyBhWzJdO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIE5vcm1hbGl6ZSBhIHZlYzNcclxuICpcclxuICogQHBhcmFtIHt2ZWMzfSBvdXQgdGhlIHJlY2VpdmluZyB2ZWN0b3JcclxuICogQHBhcmFtIHt2ZWMzfSBhIHZlY3RvciB0byBub3JtYWxpemVcclxuICogQHJldHVybnMge3ZlYzN9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBub3JtYWxpemUob3V0LCBhKSB7XG4gIHZhciB4ID0gYVswXTtcbiAgdmFyIHkgPSBhWzFdO1xuICB2YXIgeiA9IGFbMl07XG4gIHZhciBsZW4gPSB4ICogeCArIHkgKiB5ICsgeiAqIHo7XG5cbiAgaWYgKGxlbiA+IDApIHtcbiAgICAvL1RPRE86IGV2YWx1YXRlIHVzZSBvZiBnbG1faW52c3FydCBoZXJlP1xuICAgIGxlbiA9IDEgLyBNYXRoLnNxcnQobGVuKTtcbiAgfVxuXG4gIG91dFswXSA9IGFbMF0gKiBsZW47XG4gIG91dFsxXSA9IGFbMV0gKiBsZW47XG4gIG91dFsyXSA9IGFbMl0gKiBsZW47XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogQ2FsY3VsYXRlcyB0aGUgZG90IHByb2R1Y3Qgb2YgdHdvIHZlYzMnc1xyXG4gKlxyXG4gKiBAcGFyYW0ge3ZlYzN9IGEgdGhlIGZpcnN0IG9wZXJhbmRcclxuICogQHBhcmFtIHt2ZWMzfSBiIHRoZSBzZWNvbmQgb3BlcmFuZFxyXG4gKiBAcmV0dXJucyB7TnVtYmVyfSBkb3QgcHJvZHVjdCBvZiBhIGFuZCBiXHJcbiAqL1xuXG5cbmZ1bmN0aW9uIGRvdChhLCBiKSB7XG4gIHJldHVybiBhWzBdICogYlswXSArIGFbMV0gKiBiWzFdICsgYVsyXSAqIGJbMl07XG59XG4vKipcclxuICogQ29tcHV0ZXMgdGhlIGNyb3NzIHByb2R1Y3Qgb2YgdHdvIHZlYzMnc1xyXG4gKlxyXG4gKiBAcGFyYW0ge3ZlYzN9IG91dCB0aGUgcmVjZWl2aW5nIHZlY3RvclxyXG4gKiBAcGFyYW0ge3ZlYzN9IGEgdGhlIGZpcnN0IG9wZXJhbmRcclxuICogQHBhcmFtIHt2ZWMzfSBiIHRoZSBzZWNvbmQgb3BlcmFuZFxyXG4gKiBAcmV0dXJucyB7dmVjM30gb3V0XHJcbiAqL1xuXG5cbmZ1bmN0aW9uIGNyb3NzKG91dCwgYSwgYikge1xuICB2YXIgYXggPSBhWzBdLFxuICAgICAgYXkgPSBhWzFdLFxuICAgICAgYXogPSBhWzJdO1xuICB2YXIgYnggPSBiWzBdLFxuICAgICAgYnkgPSBiWzFdLFxuICAgICAgYnogPSBiWzJdO1xuICBvdXRbMF0gPSBheSAqIGJ6IC0gYXogKiBieTtcbiAgb3V0WzFdID0gYXogKiBieCAtIGF4ICogYno7XG4gIG91dFsyXSA9IGF4ICogYnkgLSBheSAqIGJ4O1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIFBlcmZvcm1zIGEgbGluZWFyIGludGVycG9sYXRpb24gYmV0d2VlbiB0d28gdmVjMydzXHJcbiAqXHJcbiAqIEBwYXJhbSB7dmVjM30gb3V0IHRoZSByZWNlaXZpbmcgdmVjdG9yXHJcbiAqIEBwYXJhbSB7dmVjM30gYSB0aGUgZmlyc3Qgb3BlcmFuZFxyXG4gKiBAcGFyYW0ge3ZlYzN9IGIgdGhlIHNlY29uZCBvcGVyYW5kXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSB0IGludGVycG9sYXRpb24gYW1vdW50LCBpbiB0aGUgcmFuZ2UgWzAtMV0sIGJldHdlZW4gdGhlIHR3byBpbnB1dHNcclxuICogQHJldHVybnMge3ZlYzN9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBsZXJwKG91dCwgYSwgYiwgdCkge1xuICB2YXIgYXggPSBhWzBdO1xuICB2YXIgYXkgPSBhWzFdO1xuICB2YXIgYXogPSBhWzJdO1xuICBvdXRbMF0gPSBheCArIHQgKiAoYlswXSAtIGF4KTtcbiAgb3V0WzFdID0gYXkgKyB0ICogKGJbMV0gLSBheSk7XG4gIG91dFsyXSA9IGF6ICsgdCAqIChiWzJdIC0gYXopO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIFBlcmZvcm1zIGEgaGVybWl0ZSBpbnRlcnBvbGF0aW9uIHdpdGggdHdvIGNvbnRyb2wgcG9pbnRzXHJcbiAqXHJcbiAqIEBwYXJhbSB7dmVjM30gb3V0IHRoZSByZWNlaXZpbmcgdmVjdG9yXHJcbiAqIEBwYXJhbSB7dmVjM30gYSB0aGUgZmlyc3Qgb3BlcmFuZFxyXG4gKiBAcGFyYW0ge3ZlYzN9IGIgdGhlIHNlY29uZCBvcGVyYW5kXHJcbiAqIEBwYXJhbSB7dmVjM30gYyB0aGUgdGhpcmQgb3BlcmFuZFxyXG4gKiBAcGFyYW0ge3ZlYzN9IGQgdGhlIGZvdXJ0aCBvcGVyYW5kXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSB0IGludGVycG9sYXRpb24gYW1vdW50LCBpbiB0aGUgcmFuZ2UgWzAtMV0sIGJldHdlZW4gdGhlIHR3byBpbnB1dHNcclxuICogQHJldHVybnMge3ZlYzN9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBoZXJtaXRlKG91dCwgYSwgYiwgYywgZCwgdCkge1xuICB2YXIgZmFjdG9yVGltZXMyID0gdCAqIHQ7XG4gIHZhciBmYWN0b3IxID0gZmFjdG9yVGltZXMyICogKDIgKiB0IC0gMykgKyAxO1xuICB2YXIgZmFjdG9yMiA9IGZhY3RvclRpbWVzMiAqICh0IC0gMikgKyB0O1xuICB2YXIgZmFjdG9yMyA9IGZhY3RvclRpbWVzMiAqICh0IC0gMSk7XG4gIHZhciBmYWN0b3I0ID0gZmFjdG9yVGltZXMyICogKDMgLSAyICogdCk7XG4gIG91dFswXSA9IGFbMF0gKiBmYWN0b3IxICsgYlswXSAqIGZhY3RvcjIgKyBjWzBdICogZmFjdG9yMyArIGRbMF0gKiBmYWN0b3I0O1xuICBvdXRbMV0gPSBhWzFdICogZmFjdG9yMSArIGJbMV0gKiBmYWN0b3IyICsgY1sxXSAqIGZhY3RvcjMgKyBkWzFdICogZmFjdG9yNDtcbiAgb3V0WzJdID0gYVsyXSAqIGZhY3RvcjEgKyBiWzJdICogZmFjdG9yMiArIGNbMl0gKiBmYWN0b3IzICsgZFsyXSAqIGZhY3RvcjQ7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogUGVyZm9ybXMgYSBiZXppZXIgaW50ZXJwb2xhdGlvbiB3aXRoIHR3byBjb250cm9sIHBvaW50c1xyXG4gKlxyXG4gKiBAcGFyYW0ge3ZlYzN9IG91dCB0aGUgcmVjZWl2aW5nIHZlY3RvclxyXG4gKiBAcGFyYW0ge3ZlYzN9IGEgdGhlIGZpcnN0IG9wZXJhbmRcclxuICogQHBhcmFtIHt2ZWMzfSBiIHRoZSBzZWNvbmQgb3BlcmFuZFxyXG4gKiBAcGFyYW0ge3ZlYzN9IGMgdGhlIHRoaXJkIG9wZXJhbmRcclxuICogQHBhcmFtIHt2ZWMzfSBkIHRoZSBmb3VydGggb3BlcmFuZFxyXG4gKiBAcGFyYW0ge051bWJlcn0gdCBpbnRlcnBvbGF0aW9uIGFtb3VudCwgaW4gdGhlIHJhbmdlIFswLTFdLCBiZXR3ZWVuIHRoZSB0d28gaW5wdXRzXHJcbiAqIEByZXR1cm5zIHt2ZWMzfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gYmV6aWVyKG91dCwgYSwgYiwgYywgZCwgdCkge1xuICB2YXIgaW52ZXJzZUZhY3RvciA9IDEgLSB0O1xuICB2YXIgaW52ZXJzZUZhY3RvclRpbWVzVHdvID0gaW52ZXJzZUZhY3RvciAqIGludmVyc2VGYWN0b3I7XG4gIHZhciBmYWN0b3JUaW1lczIgPSB0ICogdDtcbiAgdmFyIGZhY3RvcjEgPSBpbnZlcnNlRmFjdG9yVGltZXNUd28gKiBpbnZlcnNlRmFjdG9yO1xuICB2YXIgZmFjdG9yMiA9IDMgKiB0ICogaW52ZXJzZUZhY3RvclRpbWVzVHdvO1xuICB2YXIgZmFjdG9yMyA9IDMgKiBmYWN0b3JUaW1lczIgKiBpbnZlcnNlRmFjdG9yO1xuICB2YXIgZmFjdG9yNCA9IGZhY3RvclRpbWVzMiAqIHQ7XG4gIG91dFswXSA9IGFbMF0gKiBmYWN0b3IxICsgYlswXSAqIGZhY3RvcjIgKyBjWzBdICogZmFjdG9yMyArIGRbMF0gKiBmYWN0b3I0O1xuICBvdXRbMV0gPSBhWzFdICogZmFjdG9yMSArIGJbMV0gKiBmYWN0b3IyICsgY1sxXSAqIGZhY3RvcjMgKyBkWzFdICogZmFjdG9yNDtcbiAgb3V0WzJdID0gYVsyXSAqIGZhY3RvcjEgKyBiWzJdICogZmFjdG9yMiArIGNbMl0gKiBmYWN0b3IzICsgZFsyXSAqIGZhY3RvcjQ7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogR2VuZXJhdGVzIGEgcmFuZG9tIHZlY3RvciB3aXRoIHRoZSBnaXZlbiBzY2FsZVxyXG4gKlxyXG4gKiBAcGFyYW0ge3ZlYzN9IG91dCB0aGUgcmVjZWl2aW5nIHZlY3RvclxyXG4gKiBAcGFyYW0ge051bWJlcn0gW3NjYWxlXSBMZW5ndGggb2YgdGhlIHJlc3VsdGluZyB2ZWN0b3IuIElmIG9tbWl0dGVkLCBhIHVuaXQgdmVjdG9yIHdpbGwgYmUgcmV0dXJuZWRcclxuICogQHJldHVybnMge3ZlYzN9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiByYW5kb20ob3V0LCBzY2FsZSkge1xuICBzY2FsZSA9IHNjYWxlIHx8IDEuMDtcbiAgdmFyIHIgPSBnbE1hdHJpeC5SQU5ET00oKSAqIDIuMCAqIE1hdGguUEk7XG4gIHZhciB6ID0gZ2xNYXRyaXguUkFORE9NKCkgKiAyLjAgLSAxLjA7XG4gIHZhciB6U2NhbGUgPSBNYXRoLnNxcnQoMS4wIC0geiAqIHopICogc2NhbGU7XG4gIG91dFswXSA9IE1hdGguY29zKHIpICogelNjYWxlO1xuICBvdXRbMV0gPSBNYXRoLnNpbihyKSAqIHpTY2FsZTtcbiAgb3V0WzJdID0geiAqIHNjYWxlO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIFRyYW5zZm9ybXMgdGhlIHZlYzMgd2l0aCBhIG1hdDQuXHJcbiAqIDR0aCB2ZWN0b3IgY29tcG9uZW50IGlzIGltcGxpY2l0bHkgJzEnXHJcbiAqXHJcbiAqIEBwYXJhbSB7dmVjM30gb3V0IHRoZSByZWNlaXZpbmcgdmVjdG9yXHJcbiAqIEBwYXJhbSB7dmVjM30gYSB0aGUgdmVjdG9yIHRvIHRyYW5zZm9ybVxyXG4gKiBAcGFyYW0ge21hdDR9IG0gbWF0cml4IHRvIHRyYW5zZm9ybSB3aXRoXHJcbiAqIEByZXR1cm5zIHt2ZWMzfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gdHJhbnNmb3JtTWF0NChvdXQsIGEsIG0pIHtcbiAgdmFyIHggPSBhWzBdLFxuICAgICAgeSA9IGFbMV0sXG4gICAgICB6ID0gYVsyXTtcbiAgdmFyIHcgPSBtWzNdICogeCArIG1bN10gKiB5ICsgbVsxMV0gKiB6ICsgbVsxNV07XG4gIHcgPSB3IHx8IDEuMDtcbiAgb3V0WzBdID0gKG1bMF0gKiB4ICsgbVs0XSAqIHkgKyBtWzhdICogeiArIG1bMTJdKSAvIHc7XG4gIG91dFsxXSA9IChtWzFdICogeCArIG1bNV0gKiB5ICsgbVs5XSAqIHogKyBtWzEzXSkgLyB3O1xuICBvdXRbMl0gPSAobVsyXSAqIHggKyBtWzZdICogeSArIG1bMTBdICogeiArIG1bMTRdKSAvIHc7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogVHJhbnNmb3JtcyB0aGUgdmVjMyB3aXRoIGEgbWF0My5cclxuICpcclxuICogQHBhcmFtIHt2ZWMzfSBvdXQgdGhlIHJlY2VpdmluZyB2ZWN0b3JcclxuICogQHBhcmFtIHt2ZWMzfSBhIHRoZSB2ZWN0b3IgdG8gdHJhbnNmb3JtXHJcbiAqIEBwYXJhbSB7bWF0M30gbSB0aGUgM3gzIG1hdHJpeCB0byB0cmFuc2Zvcm0gd2l0aFxyXG4gKiBAcmV0dXJucyB7dmVjM30gb3V0XHJcbiAqL1xuXG5cbmZ1bmN0aW9uIHRyYW5zZm9ybU1hdDMob3V0LCBhLCBtKSB7XG4gIHZhciB4ID0gYVswXSxcbiAgICAgIHkgPSBhWzFdLFxuICAgICAgeiA9IGFbMl07XG4gIG91dFswXSA9IHggKiBtWzBdICsgeSAqIG1bM10gKyB6ICogbVs2XTtcbiAgb3V0WzFdID0geCAqIG1bMV0gKyB5ICogbVs0XSArIHogKiBtWzddO1xuICBvdXRbMl0gPSB4ICogbVsyXSArIHkgKiBtWzVdICsgeiAqIG1bOF07XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogVHJhbnNmb3JtcyB0aGUgdmVjMyB3aXRoIGEgcXVhdFxyXG4gKiBDYW4gYWxzbyBiZSB1c2VkIGZvciBkdWFsIHF1YXRlcm5pb25zLiAoTXVsdGlwbHkgaXQgd2l0aCB0aGUgcmVhbCBwYXJ0KVxyXG4gKlxyXG4gKiBAcGFyYW0ge3ZlYzN9IG91dCB0aGUgcmVjZWl2aW5nIHZlY3RvclxyXG4gKiBAcGFyYW0ge3ZlYzN9IGEgdGhlIHZlY3RvciB0byB0cmFuc2Zvcm1cclxuICogQHBhcmFtIHtxdWF0fSBxIHF1YXRlcm5pb24gdG8gdHJhbnNmb3JtIHdpdGhcclxuICogQHJldHVybnMge3ZlYzN9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiB0cmFuc2Zvcm1RdWF0KG91dCwgYSwgcSkge1xuICAvLyBiZW5jaG1hcmtzOiBodHRwczovL2pzcGVyZi5jb20vcXVhdGVybmlvbi10cmFuc2Zvcm0tdmVjMy1pbXBsZW1lbnRhdGlvbnMtZml4ZWRcbiAgdmFyIHF4ID0gcVswXSxcbiAgICAgIHF5ID0gcVsxXSxcbiAgICAgIHF6ID0gcVsyXSxcbiAgICAgIHF3ID0gcVszXTtcbiAgdmFyIHggPSBhWzBdLFxuICAgICAgeSA9IGFbMV0sXG4gICAgICB6ID0gYVsyXTsgLy8gdmFyIHF2ZWMgPSBbcXgsIHF5LCBxel07XG4gIC8vIHZhciB1diA9IHZlYzMuY3Jvc3MoW10sIHF2ZWMsIGEpO1xuXG4gIHZhciB1dnggPSBxeSAqIHogLSBxeiAqIHksXG4gICAgICB1dnkgPSBxeiAqIHggLSBxeCAqIHosXG4gICAgICB1dnogPSBxeCAqIHkgLSBxeSAqIHg7IC8vIHZhciB1dXYgPSB2ZWMzLmNyb3NzKFtdLCBxdmVjLCB1dik7XG5cbiAgdmFyIHV1dnggPSBxeSAqIHV2eiAtIHF6ICogdXZ5LFxuICAgICAgdXV2eSA9IHF6ICogdXZ4IC0gcXggKiB1dnosXG4gICAgICB1dXZ6ID0gcXggKiB1dnkgLSBxeSAqIHV2eDsgLy8gdmVjMy5zY2FsZSh1diwgdXYsIDIgKiB3KTtcblxuICB2YXIgdzIgPSBxdyAqIDI7XG4gIHV2eCAqPSB3MjtcbiAgdXZ5ICo9IHcyO1xuICB1dnogKj0gdzI7IC8vIHZlYzMuc2NhbGUodXV2LCB1dXYsIDIpO1xuXG4gIHV1dnggKj0gMjtcbiAgdXV2eSAqPSAyO1xuICB1dXZ6ICo9IDI7IC8vIHJldHVybiB2ZWMzLmFkZChvdXQsIGEsIHZlYzMuYWRkKG91dCwgdXYsIHV1dikpO1xuXG4gIG91dFswXSA9IHggKyB1dnggKyB1dXZ4O1xuICBvdXRbMV0gPSB5ICsgdXZ5ICsgdXV2eTtcbiAgb3V0WzJdID0geiArIHV2eiArIHV1dno7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogUm90YXRlIGEgM0QgdmVjdG9yIGFyb3VuZCB0aGUgeC1heGlzXHJcbiAqIEBwYXJhbSB7dmVjM30gb3V0IFRoZSByZWNlaXZpbmcgdmVjM1xyXG4gKiBAcGFyYW0ge3ZlYzN9IGEgVGhlIHZlYzMgcG9pbnQgdG8gcm90YXRlXHJcbiAqIEBwYXJhbSB7dmVjM30gYiBUaGUgb3JpZ2luIG9mIHRoZSByb3RhdGlvblxyXG4gKiBAcGFyYW0ge051bWJlcn0gcmFkIFRoZSBhbmdsZSBvZiByb3RhdGlvbiBpbiByYWRpYW5zXHJcbiAqIEByZXR1cm5zIHt2ZWMzfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gcm90YXRlWChvdXQsIGEsIGIsIHJhZCkge1xuICB2YXIgcCA9IFtdLFxuICAgICAgciA9IFtdOyAvL1RyYW5zbGF0ZSBwb2ludCB0byB0aGUgb3JpZ2luXG5cbiAgcFswXSA9IGFbMF0gLSBiWzBdO1xuICBwWzFdID0gYVsxXSAtIGJbMV07XG4gIHBbMl0gPSBhWzJdIC0gYlsyXTsgLy9wZXJmb3JtIHJvdGF0aW9uXG5cbiAgclswXSA9IHBbMF07XG4gIHJbMV0gPSBwWzFdICogTWF0aC5jb3MocmFkKSAtIHBbMl0gKiBNYXRoLnNpbihyYWQpO1xuICByWzJdID0gcFsxXSAqIE1hdGguc2luKHJhZCkgKyBwWzJdICogTWF0aC5jb3MocmFkKTsgLy90cmFuc2xhdGUgdG8gY29ycmVjdCBwb3NpdGlvblxuXG4gIG91dFswXSA9IHJbMF0gKyBiWzBdO1xuICBvdXRbMV0gPSByWzFdICsgYlsxXTtcbiAgb3V0WzJdID0gclsyXSArIGJbMl07XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogUm90YXRlIGEgM0QgdmVjdG9yIGFyb3VuZCB0aGUgeS1heGlzXHJcbiAqIEBwYXJhbSB7dmVjM30gb3V0IFRoZSByZWNlaXZpbmcgdmVjM1xyXG4gKiBAcGFyYW0ge3ZlYzN9IGEgVGhlIHZlYzMgcG9pbnQgdG8gcm90YXRlXHJcbiAqIEBwYXJhbSB7dmVjM30gYiBUaGUgb3JpZ2luIG9mIHRoZSByb3RhdGlvblxyXG4gKiBAcGFyYW0ge051bWJlcn0gcmFkIFRoZSBhbmdsZSBvZiByb3RhdGlvbiBpbiByYWRpYW5zXHJcbiAqIEByZXR1cm5zIHt2ZWMzfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gcm90YXRlWShvdXQsIGEsIGIsIHJhZCkge1xuICB2YXIgcCA9IFtdLFxuICAgICAgciA9IFtdOyAvL1RyYW5zbGF0ZSBwb2ludCB0byB0aGUgb3JpZ2luXG5cbiAgcFswXSA9IGFbMF0gLSBiWzBdO1xuICBwWzFdID0gYVsxXSAtIGJbMV07XG4gIHBbMl0gPSBhWzJdIC0gYlsyXTsgLy9wZXJmb3JtIHJvdGF0aW9uXG5cbiAgclswXSA9IHBbMl0gKiBNYXRoLnNpbihyYWQpICsgcFswXSAqIE1hdGguY29zKHJhZCk7XG4gIHJbMV0gPSBwWzFdO1xuICByWzJdID0gcFsyXSAqIE1hdGguY29zKHJhZCkgLSBwWzBdICogTWF0aC5zaW4ocmFkKTsgLy90cmFuc2xhdGUgdG8gY29ycmVjdCBwb3NpdGlvblxuXG4gIG91dFswXSA9IHJbMF0gKyBiWzBdO1xuICBvdXRbMV0gPSByWzFdICsgYlsxXTtcbiAgb3V0WzJdID0gclsyXSArIGJbMl07XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogUm90YXRlIGEgM0QgdmVjdG9yIGFyb3VuZCB0aGUgei1heGlzXHJcbiAqIEBwYXJhbSB7dmVjM30gb3V0IFRoZSByZWNlaXZpbmcgdmVjM1xyXG4gKiBAcGFyYW0ge3ZlYzN9IGEgVGhlIHZlYzMgcG9pbnQgdG8gcm90YXRlXHJcbiAqIEBwYXJhbSB7dmVjM30gYiBUaGUgb3JpZ2luIG9mIHRoZSByb3RhdGlvblxyXG4gKiBAcGFyYW0ge051bWJlcn0gcmFkIFRoZSBhbmdsZSBvZiByb3RhdGlvbiBpbiByYWRpYW5zXHJcbiAqIEByZXR1cm5zIHt2ZWMzfSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gcm90YXRlWihvdXQsIGEsIGIsIHJhZCkge1xuICB2YXIgcCA9IFtdLFxuICAgICAgciA9IFtdOyAvL1RyYW5zbGF0ZSBwb2ludCB0byB0aGUgb3JpZ2luXG5cbiAgcFswXSA9IGFbMF0gLSBiWzBdO1xuICBwWzFdID0gYVsxXSAtIGJbMV07XG4gIHBbMl0gPSBhWzJdIC0gYlsyXTsgLy9wZXJmb3JtIHJvdGF0aW9uXG5cbiAgclswXSA9IHBbMF0gKiBNYXRoLmNvcyhyYWQpIC0gcFsxXSAqIE1hdGguc2luKHJhZCk7XG4gIHJbMV0gPSBwWzBdICogTWF0aC5zaW4ocmFkKSArIHBbMV0gKiBNYXRoLmNvcyhyYWQpO1xuICByWzJdID0gcFsyXTsgLy90cmFuc2xhdGUgdG8gY29ycmVjdCBwb3NpdGlvblxuXG4gIG91dFswXSA9IHJbMF0gKyBiWzBdO1xuICBvdXRbMV0gPSByWzFdICsgYlsxXTtcbiAgb3V0WzJdID0gclsyXSArIGJbMl07XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogR2V0IHRoZSBhbmdsZSBiZXR3ZWVuIHR3byAzRCB2ZWN0b3JzXHJcbiAqIEBwYXJhbSB7dmVjM30gYSBUaGUgZmlyc3Qgb3BlcmFuZFxyXG4gKiBAcGFyYW0ge3ZlYzN9IGIgVGhlIHNlY29uZCBvcGVyYW5kXHJcbiAqIEByZXR1cm5zIHtOdW1iZXJ9IFRoZSBhbmdsZSBpbiByYWRpYW5zXHJcbiAqL1xuXG5cbmZ1bmN0aW9uIGFuZ2xlKGEsIGIpIHtcbiAgdmFyIGF4ID0gYVswXSxcbiAgICAgIGF5ID0gYVsxXSxcbiAgICAgIGF6ID0gYVsyXSxcbiAgICAgIGJ4ID0gYlswXSxcbiAgICAgIGJ5ID0gYlsxXSxcbiAgICAgIGJ6ID0gYlsyXSxcbiAgICAgIG1hZzEgPSBNYXRoLnNxcnQoYXggKiBheCArIGF5ICogYXkgKyBheiAqIGF6KSxcbiAgICAgIG1hZzIgPSBNYXRoLnNxcnQoYnggKiBieCArIGJ5ICogYnkgKyBieiAqIGJ6KSxcbiAgICAgIG1hZyA9IG1hZzEgKiBtYWcyLFxuICAgICAgY29zaW5lID0gbWFnICYmIGRvdChhLCBiKSAvIG1hZztcbiAgcmV0dXJuIE1hdGguYWNvcyhNYXRoLm1pbihNYXRoLm1heChjb3NpbmUsIC0xKSwgMSkpO1xufVxuLyoqXHJcbiAqIFNldCB0aGUgY29tcG9uZW50cyBvZiBhIHZlYzMgdG8gemVyb1xyXG4gKlxyXG4gKiBAcGFyYW0ge3ZlYzN9IG91dCB0aGUgcmVjZWl2aW5nIHZlY3RvclxyXG4gKiBAcmV0dXJucyB7dmVjM30gb3V0XHJcbiAqL1xuXG5cbmZ1bmN0aW9uIHplcm8ob3V0KSB7XG4gIG91dFswXSA9IDAuMDtcbiAgb3V0WzFdID0gMC4wO1xuICBvdXRbMl0gPSAwLjA7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogUmV0dXJucyBhIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiBhIHZlY3RvclxyXG4gKlxyXG4gKiBAcGFyYW0ge3ZlYzN9IGEgdmVjdG9yIHRvIHJlcHJlc2VudCBhcyBhIHN0cmluZ1xyXG4gKiBAcmV0dXJucyB7U3RyaW5nfSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgdGhlIHZlY3RvclxyXG4gKi9cblxuXG5mdW5jdGlvbiBzdHIoYSkge1xuICByZXR1cm4gXCJ2ZWMzKFwiICsgYVswXSArIFwiLCBcIiArIGFbMV0gKyBcIiwgXCIgKyBhWzJdICsgXCIpXCI7XG59XG4vKipcclxuICogUmV0dXJucyB3aGV0aGVyIG9yIG5vdCB0aGUgdmVjdG9ycyBoYXZlIGV4YWN0bHkgdGhlIHNhbWUgZWxlbWVudHMgaW4gdGhlIHNhbWUgcG9zaXRpb24gKHdoZW4gY29tcGFyZWQgd2l0aCA9PT0pXHJcbiAqXHJcbiAqIEBwYXJhbSB7dmVjM30gYSBUaGUgZmlyc3QgdmVjdG9yLlxyXG4gKiBAcGFyYW0ge3ZlYzN9IGIgVGhlIHNlY29uZCB2ZWN0b3IuXHJcbiAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIHRoZSB2ZWN0b3JzIGFyZSBlcXVhbCwgZmFsc2Ugb3RoZXJ3aXNlLlxyXG4gKi9cblxuXG5mdW5jdGlvbiBleGFjdEVxdWFscyhhLCBiKSB7XG4gIHJldHVybiBhWzBdID09PSBiWzBdICYmIGFbMV0gPT09IGJbMV0gJiYgYVsyXSA9PT0gYlsyXTtcbn1cbi8qKlxyXG4gKiBSZXR1cm5zIHdoZXRoZXIgb3Igbm90IHRoZSB2ZWN0b3JzIGhhdmUgYXBwcm94aW1hdGVseSB0aGUgc2FtZSBlbGVtZW50cyBpbiB0aGUgc2FtZSBwb3NpdGlvbi5cclxuICpcclxuICogQHBhcmFtIHt2ZWMzfSBhIFRoZSBmaXJzdCB2ZWN0b3IuXHJcbiAqIEBwYXJhbSB7dmVjM30gYiBUaGUgc2Vjb25kIHZlY3Rvci5cclxuICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgdGhlIHZlY3RvcnMgYXJlIGVxdWFsLCBmYWxzZSBvdGhlcndpc2UuXHJcbiAqL1xuXG5cbmZ1bmN0aW9uIGVxdWFscyhhLCBiKSB7XG4gIHZhciBhMCA9IGFbMF0sXG4gICAgICBhMSA9IGFbMV0sXG4gICAgICBhMiA9IGFbMl07XG4gIHZhciBiMCA9IGJbMF0sXG4gICAgICBiMSA9IGJbMV0sXG4gICAgICBiMiA9IGJbMl07XG4gIHJldHVybiBNYXRoLmFicyhhMCAtIGIwKSA8PSBnbE1hdHJpeC5FUFNJTE9OICogTWF0aC5tYXgoMS4wLCBNYXRoLmFicyhhMCksIE1hdGguYWJzKGIwKSkgJiYgTWF0aC5hYnMoYTEgLSBiMSkgPD0gZ2xNYXRyaXguRVBTSUxPTiAqIE1hdGgubWF4KDEuMCwgTWF0aC5hYnMoYTEpLCBNYXRoLmFicyhiMSkpICYmIE1hdGguYWJzKGEyIC0gYjIpIDw9IGdsTWF0cml4LkVQU0lMT04gKiBNYXRoLm1heCgxLjAsIE1hdGguYWJzKGEyKSwgTWF0aC5hYnMoYjIpKTtcbn1cbi8qKlxyXG4gKiBBbGlhcyBmb3Ige0BsaW5rIHZlYzMuc3VidHJhY3R9XHJcbiAqIEBmdW5jdGlvblxyXG4gKi9cblxuXG52YXIgc3ViID0gc3VidHJhY3Q7XG4vKipcclxuICogQWxpYXMgZm9yIHtAbGluayB2ZWMzLm11bHRpcGx5fVxyXG4gKiBAZnVuY3Rpb25cclxuICovXG5cbmV4cG9ydHMuc3ViID0gc3ViO1xudmFyIG11bCA9IG11bHRpcGx5O1xuLyoqXHJcbiAqIEFsaWFzIGZvciB7QGxpbmsgdmVjMy5kaXZpZGV9XHJcbiAqIEBmdW5jdGlvblxyXG4gKi9cblxuZXhwb3J0cy5tdWwgPSBtdWw7XG52YXIgZGl2ID0gZGl2aWRlO1xuLyoqXHJcbiAqIEFsaWFzIGZvciB7QGxpbmsgdmVjMy5kaXN0YW5jZX1cclxuICogQGZ1bmN0aW9uXHJcbiAqL1xuXG5leHBvcnRzLmRpdiA9IGRpdjtcbnZhciBkaXN0ID0gZGlzdGFuY2U7XG4vKipcclxuICogQWxpYXMgZm9yIHtAbGluayB2ZWMzLnNxdWFyZWREaXN0YW5jZX1cclxuICogQGZ1bmN0aW9uXHJcbiAqL1xuXG5leHBvcnRzLmRpc3QgPSBkaXN0O1xudmFyIHNxckRpc3QgPSBzcXVhcmVkRGlzdGFuY2U7XG4vKipcclxuICogQWxpYXMgZm9yIHtAbGluayB2ZWMzLmxlbmd0aH1cclxuICogQGZ1bmN0aW9uXHJcbiAqL1xuXG5leHBvcnRzLnNxckRpc3QgPSBzcXJEaXN0O1xudmFyIGxlbiA9IGxlbmd0aDtcbi8qKlxyXG4gKiBBbGlhcyBmb3Ige0BsaW5rIHZlYzMuc3F1YXJlZExlbmd0aH1cclxuICogQGZ1bmN0aW9uXHJcbiAqL1xuXG5leHBvcnRzLmxlbiA9IGxlbjtcbnZhciBzcXJMZW4gPSBzcXVhcmVkTGVuZ3RoO1xuLyoqXHJcbiAqIFBlcmZvcm0gc29tZSBvcGVyYXRpb24gb3ZlciBhbiBhcnJheSBvZiB2ZWMzcy5cclxuICpcclxuICogQHBhcmFtIHtBcnJheX0gYSB0aGUgYXJyYXkgb2YgdmVjdG9ycyB0byBpdGVyYXRlIG92ZXJcclxuICogQHBhcmFtIHtOdW1iZXJ9IHN0cmlkZSBOdW1iZXIgb2YgZWxlbWVudHMgYmV0d2VlbiB0aGUgc3RhcnQgb2YgZWFjaCB2ZWMzLiBJZiAwIGFzc3VtZXMgdGlnaHRseSBwYWNrZWRcclxuICogQHBhcmFtIHtOdW1iZXJ9IG9mZnNldCBOdW1iZXIgb2YgZWxlbWVudHMgdG8gc2tpcCBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSBhcnJheVxyXG4gKiBAcGFyYW0ge051bWJlcn0gY291bnQgTnVtYmVyIG9mIHZlYzNzIHRvIGl0ZXJhdGUgb3Zlci4gSWYgMCBpdGVyYXRlcyBvdmVyIGVudGlyZSBhcnJheVxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBGdW5jdGlvbiB0byBjYWxsIGZvciBlYWNoIHZlY3RvciBpbiB0aGUgYXJyYXlcclxuICogQHBhcmFtIHtPYmplY3R9IFthcmddIGFkZGl0aW9uYWwgYXJndW1lbnQgdG8gcGFzcyB0byBmblxyXG4gKiBAcmV0dXJucyB7QXJyYXl9IGFcclxuICogQGZ1bmN0aW9uXHJcbiAqL1xuXG5leHBvcnRzLnNxckxlbiA9IHNxckxlbjtcblxudmFyIGZvckVhY2ggPSBmdW5jdGlvbiAoKSB7XG4gIHZhciB2ZWMgPSBjcmVhdGUoKTtcbiAgcmV0dXJuIGZ1bmN0aW9uIChhLCBzdHJpZGUsIG9mZnNldCwgY291bnQsIGZuLCBhcmcpIHtcbiAgICB2YXIgaSwgbDtcblxuICAgIGlmICghc3RyaWRlKSB7XG4gICAgICBzdHJpZGUgPSAzO1xuICAgIH1cblxuICAgIGlmICghb2Zmc2V0KSB7XG4gICAgICBvZmZzZXQgPSAwO1xuICAgIH1cblxuICAgIGlmIChjb3VudCkge1xuICAgICAgbCA9IE1hdGgubWluKGNvdW50ICogc3RyaWRlICsgb2Zmc2V0LCBhLmxlbmd0aCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGwgPSBhLmxlbmd0aDtcbiAgICB9XG5cbiAgICBmb3IgKGkgPSBvZmZzZXQ7IGkgPCBsOyBpICs9IHN0cmlkZSkge1xuICAgICAgdmVjWzBdID0gYVtpXTtcbiAgICAgIHZlY1sxXSA9IGFbaSArIDFdO1xuICAgICAgdmVjWzJdID0gYVtpICsgMl07XG4gICAgICBmbih2ZWMsIHZlYywgYXJnKTtcbiAgICAgIGFbaV0gPSB2ZWNbMF07XG4gICAgICBhW2kgKyAxXSA9IHZlY1sxXTtcbiAgICAgIGFbaSArIDJdID0gdmVjWzJdO1xuICAgIH1cblxuICAgIHJldHVybiBhO1xuICB9O1xufSgpO1xuXG5leHBvcnRzLmZvckVhY2ggPSBmb3JFYWNoOyIsIlwidXNlIHN0cmljdFwiO1xuXG5mdW5jdGlvbiBfdHlwZW9mKG9iaikgeyBcIkBiYWJlbC9oZWxwZXJzIC0gdHlwZW9mXCI7IGlmICh0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIFN5bWJvbC5pdGVyYXRvciA9PT0gXCJzeW1ib2xcIikgeyBfdHlwZW9mID0gZnVuY3Rpb24gX3R5cGVvZihvYmopIHsgcmV0dXJuIHR5cGVvZiBvYmo7IH07IH0gZWxzZSB7IF90eXBlb2YgPSBmdW5jdGlvbiBfdHlwZW9mKG9iaikgeyByZXR1cm4gb2JqICYmIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvYmouY29uc3RydWN0b3IgPT09IFN5bWJvbCAmJiBvYmogIT09IFN5bWJvbC5wcm90b3R5cGUgPyBcInN5bWJvbFwiIDogdHlwZW9mIG9iajsgfTsgfSByZXR1cm4gX3R5cGVvZihvYmopOyB9XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwge1xuICB2YWx1ZTogdHJ1ZVxufSk7XG5leHBvcnRzLmNyZWF0ZSA9IGNyZWF0ZTtcbmV4cG9ydHMuY2xvbmUgPSBjbG9uZTtcbmV4cG9ydHMuZnJvbVZhbHVlcyA9IGZyb21WYWx1ZXM7XG5leHBvcnRzLmNvcHkgPSBjb3B5O1xuZXhwb3J0cy5zZXQgPSBzZXQ7XG5leHBvcnRzLmFkZCA9IGFkZDtcbmV4cG9ydHMuc3VidHJhY3QgPSBzdWJ0cmFjdDtcbmV4cG9ydHMubXVsdGlwbHkgPSBtdWx0aXBseTtcbmV4cG9ydHMuZGl2aWRlID0gZGl2aWRlO1xuZXhwb3J0cy5jZWlsID0gY2VpbDtcbmV4cG9ydHMuZmxvb3IgPSBmbG9vcjtcbmV4cG9ydHMubWluID0gbWluO1xuZXhwb3J0cy5tYXggPSBtYXg7XG5leHBvcnRzLnJvdW5kID0gcm91bmQ7XG5leHBvcnRzLnNjYWxlID0gc2NhbGU7XG5leHBvcnRzLnNjYWxlQW5kQWRkID0gc2NhbGVBbmRBZGQ7XG5leHBvcnRzLmRpc3RhbmNlID0gZGlzdGFuY2U7XG5leHBvcnRzLnNxdWFyZWREaXN0YW5jZSA9IHNxdWFyZWREaXN0YW5jZTtcbmV4cG9ydHMubGVuZ3RoID0gbGVuZ3RoO1xuZXhwb3J0cy5zcXVhcmVkTGVuZ3RoID0gc3F1YXJlZExlbmd0aDtcbmV4cG9ydHMubmVnYXRlID0gbmVnYXRlO1xuZXhwb3J0cy5pbnZlcnNlID0gaW52ZXJzZTtcbmV4cG9ydHMubm9ybWFsaXplID0gbm9ybWFsaXplO1xuZXhwb3J0cy5kb3QgPSBkb3Q7XG5leHBvcnRzLmNyb3NzID0gY3Jvc3M7XG5leHBvcnRzLmxlcnAgPSBsZXJwO1xuZXhwb3J0cy5yYW5kb20gPSByYW5kb207XG5leHBvcnRzLnRyYW5zZm9ybU1hdDQgPSB0cmFuc2Zvcm1NYXQ0O1xuZXhwb3J0cy50cmFuc2Zvcm1RdWF0ID0gdHJhbnNmb3JtUXVhdDtcbmV4cG9ydHMuemVybyA9IHplcm87XG5leHBvcnRzLnN0ciA9IHN0cjtcbmV4cG9ydHMuZXhhY3RFcXVhbHMgPSBleGFjdEVxdWFscztcbmV4cG9ydHMuZXF1YWxzID0gZXF1YWxzO1xuZXhwb3J0cy5mb3JFYWNoID0gZXhwb3J0cy5zcXJMZW4gPSBleHBvcnRzLmxlbiA9IGV4cG9ydHMuc3FyRGlzdCA9IGV4cG9ydHMuZGlzdCA9IGV4cG9ydHMuZGl2ID0gZXhwb3J0cy5tdWwgPSBleHBvcnRzLnN1YiA9IHZvaWQgMDtcblxudmFyIGdsTWF0cml4ID0gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQocmVxdWlyZShcIi4vY29tbW9uLmpzXCIpKTtcblxuZnVuY3Rpb24gX2dldFJlcXVpcmVXaWxkY2FyZENhY2hlKCkgeyBpZiAodHlwZW9mIFdlYWtNYXAgIT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIG51bGw7IHZhciBjYWNoZSA9IG5ldyBXZWFrTWFwKCk7IF9nZXRSZXF1aXJlV2lsZGNhcmRDYWNoZSA9IGZ1bmN0aW9uIF9nZXRSZXF1aXJlV2lsZGNhcmRDYWNoZSgpIHsgcmV0dXJuIGNhY2hlOyB9OyByZXR1cm4gY2FjaGU7IH1cblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQob2JqKSB7IGlmIChvYmogJiYgb2JqLl9fZXNNb2R1bGUpIHsgcmV0dXJuIG9iajsgfSBpZiAob2JqID09PSBudWxsIHx8IF90eXBlb2Yob2JqKSAhPT0gXCJvYmplY3RcIiAmJiB0eXBlb2Ygb2JqICE9PSBcImZ1bmN0aW9uXCIpIHsgcmV0dXJuIHsgXCJkZWZhdWx0XCI6IG9iaiB9OyB9IHZhciBjYWNoZSA9IF9nZXRSZXF1aXJlV2lsZGNhcmRDYWNoZSgpOyBpZiAoY2FjaGUgJiYgY2FjaGUuaGFzKG9iaikpIHsgcmV0dXJuIGNhY2hlLmdldChvYmopOyB9IHZhciBuZXdPYmogPSB7fTsgdmFyIGhhc1Byb3BlcnR5RGVzY3JpcHRvciA9IE9iamVjdC5kZWZpbmVQcm9wZXJ0eSAmJiBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yOyBmb3IgKHZhciBrZXkgaW4gb2JqKSB7IGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpKSB7IHZhciBkZXNjID0gaGFzUHJvcGVydHlEZXNjcmlwdG9yID8gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmosIGtleSkgOiBudWxsOyBpZiAoZGVzYyAmJiAoZGVzYy5nZXQgfHwgZGVzYy5zZXQpKSB7IE9iamVjdC5kZWZpbmVQcm9wZXJ0eShuZXdPYmosIGtleSwgZGVzYyk7IH0gZWxzZSB7IG5ld09ialtrZXldID0gb2JqW2tleV07IH0gfSB9IG5ld09ialtcImRlZmF1bHRcIl0gPSBvYmo7IGlmIChjYWNoZSkgeyBjYWNoZS5zZXQob2JqLCBuZXdPYmopOyB9IHJldHVybiBuZXdPYmo7IH1cblxuLyoqXHJcbiAqIDQgRGltZW5zaW9uYWwgVmVjdG9yXHJcbiAqIEBtb2R1bGUgdmVjNFxyXG4gKi9cblxuLyoqXHJcbiAqIENyZWF0ZXMgYSBuZXcsIGVtcHR5IHZlYzRcclxuICpcclxuICogQHJldHVybnMge3ZlYzR9IGEgbmV3IDREIHZlY3RvclxyXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZSgpIHtcbiAgdmFyIG91dCA9IG5ldyBnbE1hdHJpeC5BUlJBWV9UWVBFKDQpO1xuXG4gIGlmIChnbE1hdHJpeC5BUlJBWV9UWVBFICE9IEZsb2F0MzJBcnJheSkge1xuICAgIG91dFswXSA9IDA7XG4gICAgb3V0WzFdID0gMDtcbiAgICBvdXRbMl0gPSAwO1xuICAgIG91dFszXSA9IDA7XG4gIH1cblxuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIENyZWF0ZXMgYSBuZXcgdmVjNCBpbml0aWFsaXplZCB3aXRoIHZhbHVlcyBmcm9tIGFuIGV4aXN0aW5nIHZlY3RvclxyXG4gKlxyXG4gKiBAcGFyYW0ge3ZlYzR9IGEgdmVjdG9yIHRvIGNsb25lXHJcbiAqIEByZXR1cm5zIHt2ZWM0fSBhIG5ldyA0RCB2ZWN0b3JcclxuICovXG5cblxuZnVuY3Rpb24gY2xvbmUoYSkge1xuICB2YXIgb3V0ID0gbmV3IGdsTWF0cml4LkFSUkFZX1RZUEUoNCk7XG4gIG91dFswXSA9IGFbMF07XG4gIG91dFsxXSA9IGFbMV07XG4gIG91dFsyXSA9IGFbMl07XG4gIG91dFszXSA9IGFbM107XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogQ3JlYXRlcyBhIG5ldyB2ZWM0IGluaXRpYWxpemVkIHdpdGggdGhlIGdpdmVuIHZhbHVlc1xyXG4gKlxyXG4gKiBAcGFyYW0ge051bWJlcn0geCBYIGNvbXBvbmVudFxyXG4gKiBAcGFyYW0ge051bWJlcn0geSBZIGNvbXBvbmVudFxyXG4gKiBAcGFyYW0ge051bWJlcn0geiBaIGNvbXBvbmVudFxyXG4gKiBAcGFyYW0ge051bWJlcn0gdyBXIGNvbXBvbmVudFxyXG4gKiBAcmV0dXJucyB7dmVjNH0gYSBuZXcgNEQgdmVjdG9yXHJcbiAqL1xuXG5cbmZ1bmN0aW9uIGZyb21WYWx1ZXMoeCwgeSwgeiwgdykge1xuICB2YXIgb3V0ID0gbmV3IGdsTWF0cml4LkFSUkFZX1RZUEUoNCk7XG4gIG91dFswXSA9IHg7XG4gIG91dFsxXSA9IHk7XG4gIG91dFsyXSA9IHo7XG4gIG91dFszXSA9IHc7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogQ29weSB0aGUgdmFsdWVzIGZyb20gb25lIHZlYzQgdG8gYW5vdGhlclxyXG4gKlxyXG4gKiBAcGFyYW0ge3ZlYzR9IG91dCB0aGUgcmVjZWl2aW5nIHZlY3RvclxyXG4gKiBAcGFyYW0ge3ZlYzR9IGEgdGhlIHNvdXJjZSB2ZWN0b3JcclxuICogQHJldHVybnMge3ZlYzR9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBjb3B5KG91dCwgYSkge1xuICBvdXRbMF0gPSBhWzBdO1xuICBvdXRbMV0gPSBhWzFdO1xuICBvdXRbMl0gPSBhWzJdO1xuICBvdXRbM10gPSBhWzNdO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIFNldCB0aGUgY29tcG9uZW50cyBvZiBhIHZlYzQgdG8gdGhlIGdpdmVuIHZhbHVlc1xyXG4gKlxyXG4gKiBAcGFyYW0ge3ZlYzR9IG91dCB0aGUgcmVjZWl2aW5nIHZlY3RvclxyXG4gKiBAcGFyYW0ge051bWJlcn0geCBYIGNvbXBvbmVudFxyXG4gKiBAcGFyYW0ge051bWJlcn0geSBZIGNvbXBvbmVudFxyXG4gKiBAcGFyYW0ge051bWJlcn0geiBaIGNvbXBvbmVudFxyXG4gKiBAcGFyYW0ge051bWJlcn0gdyBXIGNvbXBvbmVudFxyXG4gKiBAcmV0dXJucyB7dmVjNH0gb3V0XHJcbiAqL1xuXG5cbmZ1bmN0aW9uIHNldChvdXQsIHgsIHksIHosIHcpIHtcbiAgb3V0WzBdID0geDtcbiAgb3V0WzFdID0geTtcbiAgb3V0WzJdID0gejtcbiAgb3V0WzNdID0gdztcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBBZGRzIHR3byB2ZWM0J3NcclxuICpcclxuICogQHBhcmFtIHt2ZWM0fSBvdXQgdGhlIHJlY2VpdmluZyB2ZWN0b3JcclxuICogQHBhcmFtIHt2ZWM0fSBhIHRoZSBmaXJzdCBvcGVyYW5kXHJcbiAqIEBwYXJhbSB7dmVjNH0gYiB0aGUgc2Vjb25kIG9wZXJhbmRcclxuICogQHJldHVybnMge3ZlYzR9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBhZGQob3V0LCBhLCBiKSB7XG4gIG91dFswXSA9IGFbMF0gKyBiWzBdO1xuICBvdXRbMV0gPSBhWzFdICsgYlsxXTtcbiAgb3V0WzJdID0gYVsyXSArIGJbMl07XG4gIG91dFszXSA9IGFbM10gKyBiWzNdO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIFN1YnRyYWN0cyB2ZWN0b3IgYiBmcm9tIHZlY3RvciBhXHJcbiAqXHJcbiAqIEBwYXJhbSB7dmVjNH0gb3V0IHRoZSByZWNlaXZpbmcgdmVjdG9yXHJcbiAqIEBwYXJhbSB7dmVjNH0gYSB0aGUgZmlyc3Qgb3BlcmFuZFxyXG4gKiBAcGFyYW0ge3ZlYzR9IGIgdGhlIHNlY29uZCBvcGVyYW5kXHJcbiAqIEByZXR1cm5zIHt2ZWM0fSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gc3VidHJhY3Qob3V0LCBhLCBiKSB7XG4gIG91dFswXSA9IGFbMF0gLSBiWzBdO1xuICBvdXRbMV0gPSBhWzFdIC0gYlsxXTtcbiAgb3V0WzJdID0gYVsyXSAtIGJbMl07XG4gIG91dFszXSA9IGFbM10gLSBiWzNdO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIE11bHRpcGxpZXMgdHdvIHZlYzQnc1xyXG4gKlxyXG4gKiBAcGFyYW0ge3ZlYzR9IG91dCB0aGUgcmVjZWl2aW5nIHZlY3RvclxyXG4gKiBAcGFyYW0ge3ZlYzR9IGEgdGhlIGZpcnN0IG9wZXJhbmRcclxuICogQHBhcmFtIHt2ZWM0fSBiIHRoZSBzZWNvbmQgb3BlcmFuZFxyXG4gKiBAcmV0dXJucyB7dmVjNH0gb3V0XHJcbiAqL1xuXG5cbmZ1bmN0aW9uIG11bHRpcGx5KG91dCwgYSwgYikge1xuICBvdXRbMF0gPSBhWzBdICogYlswXTtcbiAgb3V0WzFdID0gYVsxXSAqIGJbMV07XG4gIG91dFsyXSA9IGFbMl0gKiBiWzJdO1xuICBvdXRbM10gPSBhWzNdICogYlszXTtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBEaXZpZGVzIHR3byB2ZWM0J3NcclxuICpcclxuICogQHBhcmFtIHt2ZWM0fSBvdXQgdGhlIHJlY2VpdmluZyB2ZWN0b3JcclxuICogQHBhcmFtIHt2ZWM0fSBhIHRoZSBmaXJzdCBvcGVyYW5kXHJcbiAqIEBwYXJhbSB7dmVjNH0gYiB0aGUgc2Vjb25kIG9wZXJhbmRcclxuICogQHJldHVybnMge3ZlYzR9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBkaXZpZGUob3V0LCBhLCBiKSB7XG4gIG91dFswXSA9IGFbMF0gLyBiWzBdO1xuICBvdXRbMV0gPSBhWzFdIC8gYlsxXTtcbiAgb3V0WzJdID0gYVsyXSAvIGJbMl07XG4gIG91dFszXSA9IGFbM10gLyBiWzNdO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIE1hdGguY2VpbCB0aGUgY29tcG9uZW50cyBvZiBhIHZlYzRcclxuICpcclxuICogQHBhcmFtIHt2ZWM0fSBvdXQgdGhlIHJlY2VpdmluZyB2ZWN0b3JcclxuICogQHBhcmFtIHt2ZWM0fSBhIHZlY3RvciB0byBjZWlsXHJcbiAqIEByZXR1cm5zIHt2ZWM0fSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gY2VpbChvdXQsIGEpIHtcbiAgb3V0WzBdID0gTWF0aC5jZWlsKGFbMF0pO1xuICBvdXRbMV0gPSBNYXRoLmNlaWwoYVsxXSk7XG4gIG91dFsyXSA9IE1hdGguY2VpbChhWzJdKTtcbiAgb3V0WzNdID0gTWF0aC5jZWlsKGFbM10pO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIE1hdGguZmxvb3IgdGhlIGNvbXBvbmVudHMgb2YgYSB2ZWM0XHJcbiAqXHJcbiAqIEBwYXJhbSB7dmVjNH0gb3V0IHRoZSByZWNlaXZpbmcgdmVjdG9yXHJcbiAqIEBwYXJhbSB7dmVjNH0gYSB2ZWN0b3IgdG8gZmxvb3JcclxuICogQHJldHVybnMge3ZlYzR9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBmbG9vcihvdXQsIGEpIHtcbiAgb3V0WzBdID0gTWF0aC5mbG9vcihhWzBdKTtcbiAgb3V0WzFdID0gTWF0aC5mbG9vcihhWzFdKTtcbiAgb3V0WzJdID0gTWF0aC5mbG9vcihhWzJdKTtcbiAgb3V0WzNdID0gTWF0aC5mbG9vcihhWzNdKTtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBSZXR1cm5zIHRoZSBtaW5pbXVtIG9mIHR3byB2ZWM0J3NcclxuICpcclxuICogQHBhcmFtIHt2ZWM0fSBvdXQgdGhlIHJlY2VpdmluZyB2ZWN0b3JcclxuICogQHBhcmFtIHt2ZWM0fSBhIHRoZSBmaXJzdCBvcGVyYW5kXHJcbiAqIEBwYXJhbSB7dmVjNH0gYiB0aGUgc2Vjb25kIG9wZXJhbmRcclxuICogQHJldHVybnMge3ZlYzR9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBtaW4ob3V0LCBhLCBiKSB7XG4gIG91dFswXSA9IE1hdGgubWluKGFbMF0sIGJbMF0pO1xuICBvdXRbMV0gPSBNYXRoLm1pbihhWzFdLCBiWzFdKTtcbiAgb3V0WzJdID0gTWF0aC5taW4oYVsyXSwgYlsyXSk7XG4gIG91dFszXSA9IE1hdGgubWluKGFbM10sIGJbM10pO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIFJldHVybnMgdGhlIG1heGltdW0gb2YgdHdvIHZlYzQnc1xyXG4gKlxyXG4gKiBAcGFyYW0ge3ZlYzR9IG91dCB0aGUgcmVjZWl2aW5nIHZlY3RvclxyXG4gKiBAcGFyYW0ge3ZlYzR9IGEgdGhlIGZpcnN0IG9wZXJhbmRcclxuICogQHBhcmFtIHt2ZWM0fSBiIHRoZSBzZWNvbmQgb3BlcmFuZFxyXG4gKiBAcmV0dXJucyB7dmVjNH0gb3V0XHJcbiAqL1xuXG5cbmZ1bmN0aW9uIG1heChvdXQsIGEsIGIpIHtcbiAgb3V0WzBdID0gTWF0aC5tYXgoYVswXSwgYlswXSk7XG4gIG91dFsxXSA9IE1hdGgubWF4KGFbMV0sIGJbMV0pO1xuICBvdXRbMl0gPSBNYXRoLm1heChhWzJdLCBiWzJdKTtcbiAgb3V0WzNdID0gTWF0aC5tYXgoYVszXSwgYlszXSk7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogTWF0aC5yb3VuZCB0aGUgY29tcG9uZW50cyBvZiBhIHZlYzRcclxuICpcclxuICogQHBhcmFtIHt2ZWM0fSBvdXQgdGhlIHJlY2VpdmluZyB2ZWN0b3JcclxuICogQHBhcmFtIHt2ZWM0fSBhIHZlY3RvciB0byByb3VuZFxyXG4gKiBAcmV0dXJucyB7dmVjNH0gb3V0XHJcbiAqL1xuXG5cbmZ1bmN0aW9uIHJvdW5kKG91dCwgYSkge1xuICBvdXRbMF0gPSBNYXRoLnJvdW5kKGFbMF0pO1xuICBvdXRbMV0gPSBNYXRoLnJvdW5kKGFbMV0pO1xuICBvdXRbMl0gPSBNYXRoLnJvdW5kKGFbMl0pO1xuICBvdXRbM10gPSBNYXRoLnJvdW5kKGFbM10pO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIFNjYWxlcyBhIHZlYzQgYnkgYSBzY2FsYXIgbnVtYmVyXHJcbiAqXHJcbiAqIEBwYXJhbSB7dmVjNH0gb3V0IHRoZSByZWNlaXZpbmcgdmVjdG9yXHJcbiAqIEBwYXJhbSB7dmVjNH0gYSB0aGUgdmVjdG9yIHRvIHNjYWxlXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBiIGFtb3VudCB0byBzY2FsZSB0aGUgdmVjdG9yIGJ5XHJcbiAqIEByZXR1cm5zIHt2ZWM0fSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gc2NhbGUob3V0LCBhLCBiKSB7XG4gIG91dFswXSA9IGFbMF0gKiBiO1xuICBvdXRbMV0gPSBhWzFdICogYjtcbiAgb3V0WzJdID0gYVsyXSAqIGI7XG4gIG91dFszXSA9IGFbM10gKiBiO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIEFkZHMgdHdvIHZlYzQncyBhZnRlciBzY2FsaW5nIHRoZSBzZWNvbmQgb3BlcmFuZCBieSBhIHNjYWxhciB2YWx1ZVxyXG4gKlxyXG4gKiBAcGFyYW0ge3ZlYzR9IG91dCB0aGUgcmVjZWl2aW5nIHZlY3RvclxyXG4gKiBAcGFyYW0ge3ZlYzR9IGEgdGhlIGZpcnN0IG9wZXJhbmRcclxuICogQHBhcmFtIHt2ZWM0fSBiIHRoZSBzZWNvbmQgb3BlcmFuZFxyXG4gKiBAcGFyYW0ge051bWJlcn0gc2NhbGUgdGhlIGFtb3VudCB0byBzY2FsZSBiIGJ5IGJlZm9yZSBhZGRpbmdcclxuICogQHJldHVybnMge3ZlYzR9IG91dFxyXG4gKi9cblxuXG5mdW5jdGlvbiBzY2FsZUFuZEFkZChvdXQsIGEsIGIsIHNjYWxlKSB7XG4gIG91dFswXSA9IGFbMF0gKyBiWzBdICogc2NhbGU7XG4gIG91dFsxXSA9IGFbMV0gKyBiWzFdICogc2NhbGU7XG4gIG91dFsyXSA9IGFbMl0gKyBiWzJdICogc2NhbGU7XG4gIG91dFszXSA9IGFbM10gKyBiWzNdICogc2NhbGU7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogQ2FsY3VsYXRlcyB0aGUgZXVjbGlkaWFuIGRpc3RhbmNlIGJldHdlZW4gdHdvIHZlYzQnc1xyXG4gKlxyXG4gKiBAcGFyYW0ge3ZlYzR9IGEgdGhlIGZpcnN0IG9wZXJhbmRcclxuICogQHBhcmFtIHt2ZWM0fSBiIHRoZSBzZWNvbmQgb3BlcmFuZFxyXG4gKiBAcmV0dXJucyB7TnVtYmVyfSBkaXN0YW5jZSBiZXR3ZWVuIGEgYW5kIGJcclxuICovXG5cblxuZnVuY3Rpb24gZGlzdGFuY2UoYSwgYikge1xuICB2YXIgeCA9IGJbMF0gLSBhWzBdO1xuICB2YXIgeSA9IGJbMV0gLSBhWzFdO1xuICB2YXIgeiA9IGJbMl0gLSBhWzJdO1xuICB2YXIgdyA9IGJbM10gLSBhWzNdO1xuICByZXR1cm4gTWF0aC5oeXBvdCh4LCB5LCB6LCB3KTtcbn1cbi8qKlxyXG4gKiBDYWxjdWxhdGVzIHRoZSBzcXVhcmVkIGV1Y2xpZGlhbiBkaXN0YW5jZSBiZXR3ZWVuIHR3byB2ZWM0J3NcclxuICpcclxuICogQHBhcmFtIHt2ZWM0fSBhIHRoZSBmaXJzdCBvcGVyYW5kXHJcbiAqIEBwYXJhbSB7dmVjNH0gYiB0aGUgc2Vjb25kIG9wZXJhbmRcclxuICogQHJldHVybnMge051bWJlcn0gc3F1YXJlZCBkaXN0YW5jZSBiZXR3ZWVuIGEgYW5kIGJcclxuICovXG5cblxuZnVuY3Rpb24gc3F1YXJlZERpc3RhbmNlKGEsIGIpIHtcbiAgdmFyIHggPSBiWzBdIC0gYVswXTtcbiAgdmFyIHkgPSBiWzFdIC0gYVsxXTtcbiAgdmFyIHogPSBiWzJdIC0gYVsyXTtcbiAgdmFyIHcgPSBiWzNdIC0gYVszXTtcbiAgcmV0dXJuIHggKiB4ICsgeSAqIHkgKyB6ICogeiArIHcgKiB3O1xufVxuLyoqXHJcbiAqIENhbGN1bGF0ZXMgdGhlIGxlbmd0aCBvZiBhIHZlYzRcclxuICpcclxuICogQHBhcmFtIHt2ZWM0fSBhIHZlY3RvciB0byBjYWxjdWxhdGUgbGVuZ3RoIG9mXHJcbiAqIEByZXR1cm5zIHtOdW1iZXJ9IGxlbmd0aCBvZiBhXHJcbiAqL1xuXG5cbmZ1bmN0aW9uIGxlbmd0aChhKSB7XG4gIHZhciB4ID0gYVswXTtcbiAgdmFyIHkgPSBhWzFdO1xuICB2YXIgeiA9IGFbMl07XG4gIHZhciB3ID0gYVszXTtcbiAgcmV0dXJuIE1hdGguaHlwb3QoeCwgeSwgeiwgdyk7XG59XG4vKipcclxuICogQ2FsY3VsYXRlcyB0aGUgc3F1YXJlZCBsZW5ndGggb2YgYSB2ZWM0XHJcbiAqXHJcbiAqIEBwYXJhbSB7dmVjNH0gYSB2ZWN0b3IgdG8gY2FsY3VsYXRlIHNxdWFyZWQgbGVuZ3RoIG9mXHJcbiAqIEByZXR1cm5zIHtOdW1iZXJ9IHNxdWFyZWQgbGVuZ3RoIG9mIGFcclxuICovXG5cblxuZnVuY3Rpb24gc3F1YXJlZExlbmd0aChhKSB7XG4gIHZhciB4ID0gYVswXTtcbiAgdmFyIHkgPSBhWzFdO1xuICB2YXIgeiA9IGFbMl07XG4gIHZhciB3ID0gYVszXTtcbiAgcmV0dXJuIHggKiB4ICsgeSAqIHkgKyB6ICogeiArIHcgKiB3O1xufVxuLyoqXHJcbiAqIE5lZ2F0ZXMgdGhlIGNvbXBvbmVudHMgb2YgYSB2ZWM0XHJcbiAqXHJcbiAqIEBwYXJhbSB7dmVjNH0gb3V0IHRoZSByZWNlaXZpbmcgdmVjdG9yXHJcbiAqIEBwYXJhbSB7dmVjNH0gYSB2ZWN0b3IgdG8gbmVnYXRlXHJcbiAqIEByZXR1cm5zIHt2ZWM0fSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gbmVnYXRlKG91dCwgYSkge1xuICBvdXRbMF0gPSAtYVswXTtcbiAgb3V0WzFdID0gLWFbMV07XG4gIG91dFsyXSA9IC1hWzJdO1xuICBvdXRbM10gPSAtYVszXTtcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBSZXR1cm5zIHRoZSBpbnZlcnNlIG9mIHRoZSBjb21wb25lbnRzIG9mIGEgdmVjNFxyXG4gKlxyXG4gKiBAcGFyYW0ge3ZlYzR9IG91dCB0aGUgcmVjZWl2aW5nIHZlY3RvclxyXG4gKiBAcGFyYW0ge3ZlYzR9IGEgdmVjdG9yIHRvIGludmVydFxyXG4gKiBAcmV0dXJucyB7dmVjNH0gb3V0XHJcbiAqL1xuXG5cbmZ1bmN0aW9uIGludmVyc2Uob3V0LCBhKSB7XG4gIG91dFswXSA9IDEuMCAvIGFbMF07XG4gIG91dFsxXSA9IDEuMCAvIGFbMV07XG4gIG91dFsyXSA9IDEuMCAvIGFbMl07XG4gIG91dFszXSA9IDEuMCAvIGFbM107XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogTm9ybWFsaXplIGEgdmVjNFxyXG4gKlxyXG4gKiBAcGFyYW0ge3ZlYzR9IG91dCB0aGUgcmVjZWl2aW5nIHZlY3RvclxyXG4gKiBAcGFyYW0ge3ZlYzR9IGEgdmVjdG9yIHRvIG5vcm1hbGl6ZVxyXG4gKiBAcmV0dXJucyB7dmVjNH0gb3V0XHJcbiAqL1xuXG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZShvdXQsIGEpIHtcbiAgdmFyIHggPSBhWzBdO1xuICB2YXIgeSA9IGFbMV07XG4gIHZhciB6ID0gYVsyXTtcbiAgdmFyIHcgPSBhWzNdO1xuICB2YXIgbGVuID0geCAqIHggKyB5ICogeSArIHogKiB6ICsgdyAqIHc7XG5cbiAgaWYgKGxlbiA+IDApIHtcbiAgICBsZW4gPSAxIC8gTWF0aC5zcXJ0KGxlbik7XG4gIH1cblxuICBvdXRbMF0gPSB4ICogbGVuO1xuICBvdXRbMV0gPSB5ICogbGVuO1xuICBvdXRbMl0gPSB6ICogbGVuO1xuICBvdXRbM10gPSB3ICogbGVuO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIENhbGN1bGF0ZXMgdGhlIGRvdCBwcm9kdWN0IG9mIHR3byB2ZWM0J3NcclxuICpcclxuICogQHBhcmFtIHt2ZWM0fSBhIHRoZSBmaXJzdCBvcGVyYW5kXHJcbiAqIEBwYXJhbSB7dmVjNH0gYiB0aGUgc2Vjb25kIG9wZXJhbmRcclxuICogQHJldHVybnMge051bWJlcn0gZG90IHByb2R1Y3Qgb2YgYSBhbmQgYlxyXG4gKi9cblxuXG5mdW5jdGlvbiBkb3QoYSwgYikge1xuICByZXR1cm4gYVswXSAqIGJbMF0gKyBhWzFdICogYlsxXSArIGFbMl0gKiBiWzJdICsgYVszXSAqIGJbM107XG59XG4vKipcclxuICogUmV0dXJucyB0aGUgY3Jvc3MtcHJvZHVjdCBvZiB0aHJlZSB2ZWN0b3JzIGluIGEgNC1kaW1lbnNpb25hbCBzcGFjZVxyXG4gKlxyXG4gKiBAcGFyYW0ge3ZlYzR9IHJlc3VsdCB0aGUgcmVjZWl2aW5nIHZlY3RvclxyXG4gKiBAcGFyYW0ge3ZlYzR9IFUgdGhlIGZpcnN0IHZlY3RvclxyXG4gKiBAcGFyYW0ge3ZlYzR9IFYgdGhlIHNlY29uZCB2ZWN0b3JcclxuICogQHBhcmFtIHt2ZWM0fSBXIHRoZSB0aGlyZCB2ZWN0b3JcclxuICogQHJldHVybnMge3ZlYzR9IHJlc3VsdFxyXG4gKi9cblxuXG5mdW5jdGlvbiBjcm9zcyhvdXQsIHUsIHYsIHcpIHtcbiAgdmFyIEEgPSB2WzBdICogd1sxXSAtIHZbMV0gKiB3WzBdLFxuICAgICAgQiA9IHZbMF0gKiB3WzJdIC0gdlsyXSAqIHdbMF0sXG4gICAgICBDID0gdlswXSAqIHdbM10gLSB2WzNdICogd1swXSxcbiAgICAgIEQgPSB2WzFdICogd1syXSAtIHZbMl0gKiB3WzFdLFxuICAgICAgRSA9IHZbMV0gKiB3WzNdIC0gdlszXSAqIHdbMV0sXG4gICAgICBGID0gdlsyXSAqIHdbM10gLSB2WzNdICogd1syXTtcbiAgdmFyIEcgPSB1WzBdO1xuICB2YXIgSCA9IHVbMV07XG4gIHZhciBJID0gdVsyXTtcbiAgdmFyIEogPSB1WzNdO1xuICBvdXRbMF0gPSBIICogRiAtIEkgKiBFICsgSiAqIEQ7XG4gIG91dFsxXSA9IC0oRyAqIEYpICsgSSAqIEMgLSBKICogQjtcbiAgb3V0WzJdID0gRyAqIEUgLSBIICogQyArIEogKiBBO1xuICBvdXRbM10gPSAtKEcgKiBEKSArIEggKiBCIC0gSSAqIEE7XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogUGVyZm9ybXMgYSBsaW5lYXIgaW50ZXJwb2xhdGlvbiBiZXR3ZWVuIHR3byB2ZWM0J3NcclxuICpcclxuICogQHBhcmFtIHt2ZWM0fSBvdXQgdGhlIHJlY2VpdmluZyB2ZWN0b3JcclxuICogQHBhcmFtIHt2ZWM0fSBhIHRoZSBmaXJzdCBvcGVyYW5kXHJcbiAqIEBwYXJhbSB7dmVjNH0gYiB0aGUgc2Vjb25kIG9wZXJhbmRcclxuICogQHBhcmFtIHtOdW1iZXJ9IHQgaW50ZXJwb2xhdGlvbiBhbW91bnQsIGluIHRoZSByYW5nZSBbMC0xXSwgYmV0d2VlbiB0aGUgdHdvIGlucHV0c1xyXG4gKiBAcmV0dXJucyB7dmVjNH0gb3V0XHJcbiAqL1xuXG5cbmZ1bmN0aW9uIGxlcnAob3V0LCBhLCBiLCB0KSB7XG4gIHZhciBheCA9IGFbMF07XG4gIHZhciBheSA9IGFbMV07XG4gIHZhciBheiA9IGFbMl07XG4gIHZhciBhdyA9IGFbM107XG4gIG91dFswXSA9IGF4ICsgdCAqIChiWzBdIC0gYXgpO1xuICBvdXRbMV0gPSBheSArIHQgKiAoYlsxXSAtIGF5KTtcbiAgb3V0WzJdID0gYXogKyB0ICogKGJbMl0gLSBheik7XG4gIG91dFszXSA9IGF3ICsgdCAqIChiWzNdIC0gYXcpO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIEdlbmVyYXRlcyBhIHJhbmRvbSB2ZWN0b3Igd2l0aCB0aGUgZ2l2ZW4gc2NhbGVcclxuICpcclxuICogQHBhcmFtIHt2ZWM0fSBvdXQgdGhlIHJlY2VpdmluZyB2ZWN0b3JcclxuICogQHBhcmFtIHtOdW1iZXJ9IFtzY2FsZV0gTGVuZ3RoIG9mIHRoZSByZXN1bHRpbmcgdmVjdG9yLiBJZiBvbW1pdHRlZCwgYSB1bml0IHZlY3RvciB3aWxsIGJlIHJldHVybmVkXHJcbiAqIEByZXR1cm5zIHt2ZWM0fSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gcmFuZG9tKG91dCwgc2NhbGUpIHtcbiAgc2NhbGUgPSBzY2FsZSB8fCAxLjA7IC8vIE1hcnNhZ2xpYSwgR2VvcmdlLiBDaG9vc2luZyBhIFBvaW50IGZyb20gdGhlIFN1cmZhY2Ugb2YgYVxuICAvLyBTcGhlcmUuIEFubi4gTWF0aC4gU3RhdGlzdC4gNDMgKDE5NzIpLCBuby4gMiwgNjQ1LS02NDYuXG4gIC8vIGh0dHA6Ly9wcm9qZWN0ZXVjbGlkLm9yZy9ldWNsaWQuYW9tcy8xMTc3NjkyNjQ0O1xuXG4gIHZhciB2MSwgdjIsIHYzLCB2NDtcbiAgdmFyIHMxLCBzMjtcblxuICBkbyB7XG4gICAgdjEgPSBnbE1hdHJpeC5SQU5ET00oKSAqIDIgLSAxO1xuICAgIHYyID0gZ2xNYXRyaXguUkFORE9NKCkgKiAyIC0gMTtcbiAgICBzMSA9IHYxICogdjEgKyB2MiAqIHYyO1xuICB9IHdoaWxlIChzMSA+PSAxKTtcblxuICBkbyB7XG4gICAgdjMgPSBnbE1hdHJpeC5SQU5ET00oKSAqIDIgLSAxO1xuICAgIHY0ID0gZ2xNYXRyaXguUkFORE9NKCkgKiAyIC0gMTtcbiAgICBzMiA9IHYzICogdjMgKyB2NCAqIHY0O1xuICB9IHdoaWxlIChzMiA+PSAxKTtcblxuICB2YXIgZCA9IE1hdGguc3FydCgoMSAtIHMxKSAvIHMyKTtcbiAgb3V0WzBdID0gc2NhbGUgKiB2MTtcbiAgb3V0WzFdID0gc2NhbGUgKiB2MjtcbiAgb3V0WzJdID0gc2NhbGUgKiB2MyAqIGQ7XG4gIG91dFszXSA9IHNjYWxlICogdjQgKiBkO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIFRyYW5zZm9ybXMgdGhlIHZlYzQgd2l0aCBhIG1hdDQuXHJcbiAqXHJcbiAqIEBwYXJhbSB7dmVjNH0gb3V0IHRoZSByZWNlaXZpbmcgdmVjdG9yXHJcbiAqIEBwYXJhbSB7dmVjNH0gYSB0aGUgdmVjdG9yIHRvIHRyYW5zZm9ybVxyXG4gKiBAcGFyYW0ge21hdDR9IG0gbWF0cml4IHRvIHRyYW5zZm9ybSB3aXRoXHJcbiAqIEByZXR1cm5zIHt2ZWM0fSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gdHJhbnNmb3JtTWF0NChvdXQsIGEsIG0pIHtcbiAgdmFyIHggPSBhWzBdLFxuICAgICAgeSA9IGFbMV0sXG4gICAgICB6ID0gYVsyXSxcbiAgICAgIHcgPSBhWzNdO1xuICBvdXRbMF0gPSBtWzBdICogeCArIG1bNF0gKiB5ICsgbVs4XSAqIHogKyBtWzEyXSAqIHc7XG4gIG91dFsxXSA9IG1bMV0gKiB4ICsgbVs1XSAqIHkgKyBtWzldICogeiArIG1bMTNdICogdztcbiAgb3V0WzJdID0gbVsyXSAqIHggKyBtWzZdICogeSArIG1bMTBdICogeiArIG1bMTRdICogdztcbiAgb3V0WzNdID0gbVszXSAqIHggKyBtWzddICogeSArIG1bMTFdICogeiArIG1bMTVdICogdztcbiAgcmV0dXJuIG91dDtcbn1cbi8qKlxyXG4gKiBUcmFuc2Zvcm1zIHRoZSB2ZWM0IHdpdGggYSBxdWF0XHJcbiAqXHJcbiAqIEBwYXJhbSB7dmVjNH0gb3V0IHRoZSByZWNlaXZpbmcgdmVjdG9yXHJcbiAqIEBwYXJhbSB7dmVjNH0gYSB0aGUgdmVjdG9yIHRvIHRyYW5zZm9ybVxyXG4gKiBAcGFyYW0ge3F1YXR9IHEgcXVhdGVybmlvbiB0byB0cmFuc2Zvcm0gd2l0aFxyXG4gKiBAcmV0dXJucyB7dmVjNH0gb3V0XHJcbiAqL1xuXG5cbmZ1bmN0aW9uIHRyYW5zZm9ybVF1YXQob3V0LCBhLCBxKSB7XG4gIHZhciB4ID0gYVswXSxcbiAgICAgIHkgPSBhWzFdLFxuICAgICAgeiA9IGFbMl07XG4gIHZhciBxeCA9IHFbMF0sXG4gICAgICBxeSA9IHFbMV0sXG4gICAgICBxeiA9IHFbMl0sXG4gICAgICBxdyA9IHFbM107IC8vIGNhbGN1bGF0ZSBxdWF0ICogdmVjXG5cbiAgdmFyIGl4ID0gcXcgKiB4ICsgcXkgKiB6IC0gcXogKiB5O1xuICB2YXIgaXkgPSBxdyAqIHkgKyBxeiAqIHggLSBxeCAqIHo7XG4gIHZhciBpeiA9IHF3ICogeiArIHF4ICogeSAtIHF5ICogeDtcbiAgdmFyIGl3ID0gLXF4ICogeCAtIHF5ICogeSAtIHF6ICogejsgLy8gY2FsY3VsYXRlIHJlc3VsdCAqIGludmVyc2UgcXVhdFxuXG4gIG91dFswXSA9IGl4ICogcXcgKyBpdyAqIC1xeCArIGl5ICogLXF6IC0gaXogKiAtcXk7XG4gIG91dFsxXSA9IGl5ICogcXcgKyBpdyAqIC1xeSArIGl6ICogLXF4IC0gaXggKiAtcXo7XG4gIG91dFsyXSA9IGl6ICogcXcgKyBpdyAqIC1xeiArIGl4ICogLXF5IC0gaXkgKiAtcXg7XG4gIG91dFszXSA9IGFbM107XG4gIHJldHVybiBvdXQ7XG59XG4vKipcclxuICogU2V0IHRoZSBjb21wb25lbnRzIG9mIGEgdmVjNCB0byB6ZXJvXHJcbiAqXHJcbiAqIEBwYXJhbSB7dmVjNH0gb3V0IHRoZSByZWNlaXZpbmcgdmVjdG9yXHJcbiAqIEByZXR1cm5zIHt2ZWM0fSBvdXRcclxuICovXG5cblxuZnVuY3Rpb24gemVybyhvdXQpIHtcbiAgb3V0WzBdID0gMC4wO1xuICBvdXRbMV0gPSAwLjA7XG4gIG91dFsyXSA9IDAuMDtcbiAgb3V0WzNdID0gMC4wO1xuICByZXR1cm4gb3V0O1xufVxuLyoqXHJcbiAqIFJldHVybnMgYSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgYSB2ZWN0b3JcclxuICpcclxuICogQHBhcmFtIHt2ZWM0fSBhIHZlY3RvciB0byByZXByZXNlbnQgYXMgYSBzdHJpbmdcclxuICogQHJldHVybnMge1N0cmluZ30gc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIHRoZSB2ZWN0b3JcclxuICovXG5cblxuZnVuY3Rpb24gc3RyKGEpIHtcbiAgcmV0dXJuIFwidmVjNChcIiArIGFbMF0gKyBcIiwgXCIgKyBhWzFdICsgXCIsIFwiICsgYVsyXSArIFwiLCBcIiArIGFbM10gKyBcIilcIjtcbn1cbi8qKlxyXG4gKiBSZXR1cm5zIHdoZXRoZXIgb3Igbm90IHRoZSB2ZWN0b3JzIGhhdmUgZXhhY3RseSB0aGUgc2FtZSBlbGVtZW50cyBpbiB0aGUgc2FtZSBwb3NpdGlvbiAod2hlbiBjb21wYXJlZCB3aXRoID09PSlcclxuICpcclxuICogQHBhcmFtIHt2ZWM0fSBhIFRoZSBmaXJzdCB2ZWN0b3IuXHJcbiAqIEBwYXJhbSB7dmVjNH0gYiBUaGUgc2Vjb25kIHZlY3Rvci5cclxuICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgdGhlIHZlY3RvcnMgYXJlIGVxdWFsLCBmYWxzZSBvdGhlcndpc2UuXHJcbiAqL1xuXG5cbmZ1bmN0aW9uIGV4YWN0RXF1YWxzKGEsIGIpIHtcbiAgcmV0dXJuIGFbMF0gPT09IGJbMF0gJiYgYVsxXSA9PT0gYlsxXSAmJiBhWzJdID09PSBiWzJdICYmIGFbM10gPT09IGJbM107XG59XG4vKipcclxuICogUmV0dXJucyB3aGV0aGVyIG9yIG5vdCB0aGUgdmVjdG9ycyBoYXZlIGFwcHJveGltYXRlbHkgdGhlIHNhbWUgZWxlbWVudHMgaW4gdGhlIHNhbWUgcG9zaXRpb24uXHJcbiAqXHJcbiAqIEBwYXJhbSB7dmVjNH0gYSBUaGUgZmlyc3QgdmVjdG9yLlxyXG4gKiBAcGFyYW0ge3ZlYzR9IGIgVGhlIHNlY29uZCB2ZWN0b3IuXHJcbiAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIHRoZSB2ZWN0b3JzIGFyZSBlcXVhbCwgZmFsc2Ugb3RoZXJ3aXNlLlxyXG4gKi9cblxuXG5mdW5jdGlvbiBlcXVhbHMoYSwgYikge1xuICB2YXIgYTAgPSBhWzBdLFxuICAgICAgYTEgPSBhWzFdLFxuICAgICAgYTIgPSBhWzJdLFxuICAgICAgYTMgPSBhWzNdO1xuICB2YXIgYjAgPSBiWzBdLFxuICAgICAgYjEgPSBiWzFdLFxuICAgICAgYjIgPSBiWzJdLFxuICAgICAgYjMgPSBiWzNdO1xuICByZXR1cm4gTWF0aC5hYnMoYTAgLSBiMCkgPD0gZ2xNYXRyaXguRVBTSUxPTiAqIE1hdGgubWF4KDEuMCwgTWF0aC5hYnMoYTApLCBNYXRoLmFicyhiMCkpICYmIE1hdGguYWJzKGExIC0gYjEpIDw9IGdsTWF0cml4LkVQU0lMT04gKiBNYXRoLm1heCgxLjAsIE1hdGguYWJzKGExKSwgTWF0aC5hYnMoYjEpKSAmJiBNYXRoLmFicyhhMiAtIGIyKSA8PSBnbE1hdHJpeC5FUFNJTE9OICogTWF0aC5tYXgoMS4wLCBNYXRoLmFicyhhMiksIE1hdGguYWJzKGIyKSkgJiYgTWF0aC5hYnMoYTMgLSBiMykgPD0gZ2xNYXRyaXguRVBTSUxPTiAqIE1hdGgubWF4KDEuMCwgTWF0aC5hYnMoYTMpLCBNYXRoLmFicyhiMykpO1xufVxuLyoqXHJcbiAqIEFsaWFzIGZvciB7QGxpbmsgdmVjNC5zdWJ0cmFjdH1cclxuICogQGZ1bmN0aW9uXHJcbiAqL1xuXG5cbnZhciBzdWIgPSBzdWJ0cmFjdDtcbi8qKlxyXG4gKiBBbGlhcyBmb3Ige0BsaW5rIHZlYzQubXVsdGlwbHl9XHJcbiAqIEBmdW5jdGlvblxyXG4gKi9cblxuZXhwb3J0cy5zdWIgPSBzdWI7XG52YXIgbXVsID0gbXVsdGlwbHk7XG4vKipcclxuICogQWxpYXMgZm9yIHtAbGluayB2ZWM0LmRpdmlkZX1cclxuICogQGZ1bmN0aW9uXHJcbiAqL1xuXG5leHBvcnRzLm11bCA9IG11bDtcbnZhciBkaXYgPSBkaXZpZGU7XG4vKipcclxuICogQWxpYXMgZm9yIHtAbGluayB2ZWM0LmRpc3RhbmNlfVxyXG4gKiBAZnVuY3Rpb25cclxuICovXG5cbmV4cG9ydHMuZGl2ID0gZGl2O1xudmFyIGRpc3QgPSBkaXN0YW5jZTtcbi8qKlxyXG4gKiBBbGlhcyBmb3Ige0BsaW5rIHZlYzQuc3F1YXJlZERpc3RhbmNlfVxyXG4gKiBAZnVuY3Rpb25cclxuICovXG5cbmV4cG9ydHMuZGlzdCA9IGRpc3Q7XG52YXIgc3FyRGlzdCA9IHNxdWFyZWREaXN0YW5jZTtcbi8qKlxyXG4gKiBBbGlhcyBmb3Ige0BsaW5rIHZlYzQubGVuZ3RofVxyXG4gKiBAZnVuY3Rpb25cclxuICovXG5cbmV4cG9ydHMuc3FyRGlzdCA9IHNxckRpc3Q7XG52YXIgbGVuID0gbGVuZ3RoO1xuLyoqXHJcbiAqIEFsaWFzIGZvciB7QGxpbmsgdmVjNC5zcXVhcmVkTGVuZ3RofVxyXG4gKiBAZnVuY3Rpb25cclxuICovXG5cbmV4cG9ydHMubGVuID0gbGVuO1xudmFyIHNxckxlbiA9IHNxdWFyZWRMZW5ndGg7XG4vKipcclxuICogUGVyZm9ybSBzb21lIG9wZXJhdGlvbiBvdmVyIGFuIGFycmF5IG9mIHZlYzRzLlxyXG4gKlxyXG4gKiBAcGFyYW0ge0FycmF5fSBhIHRoZSBhcnJheSBvZiB2ZWN0b3JzIHRvIGl0ZXJhdGUgb3ZlclxyXG4gKiBAcGFyYW0ge051bWJlcn0gc3RyaWRlIE51bWJlciBvZiBlbGVtZW50cyBiZXR3ZWVuIHRoZSBzdGFydCBvZiBlYWNoIHZlYzQuIElmIDAgYXNzdW1lcyB0aWdodGx5IHBhY2tlZFxyXG4gKiBAcGFyYW0ge051bWJlcn0gb2Zmc2V0IE51bWJlciBvZiBlbGVtZW50cyB0byBza2lwIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIGFycmF5XHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBjb3VudCBOdW1iZXIgb2YgdmVjNHMgdG8gaXRlcmF0ZSBvdmVyLiBJZiAwIGl0ZXJhdGVzIG92ZXIgZW50aXJlIGFycmF5XHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIEZ1bmN0aW9uIHRvIGNhbGwgZm9yIGVhY2ggdmVjdG9yIGluIHRoZSBhcnJheVxyXG4gKiBAcGFyYW0ge09iamVjdH0gW2FyZ10gYWRkaXRpb25hbCBhcmd1bWVudCB0byBwYXNzIHRvIGZuXHJcbiAqIEByZXR1cm5zIHtBcnJheX0gYVxyXG4gKiBAZnVuY3Rpb25cclxuICovXG5cbmV4cG9ydHMuc3FyTGVuID0gc3FyTGVuO1xuXG52YXIgZm9yRWFjaCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHZlYyA9IGNyZWF0ZSgpO1xuICByZXR1cm4gZnVuY3Rpb24gKGEsIHN0cmlkZSwgb2Zmc2V0LCBjb3VudCwgZm4sIGFyZykge1xuICAgIHZhciBpLCBsO1xuXG4gICAgaWYgKCFzdHJpZGUpIHtcbiAgICAgIHN0cmlkZSA9IDQ7XG4gICAgfVxuXG4gICAgaWYgKCFvZmZzZXQpIHtcbiAgICAgIG9mZnNldCA9IDA7XG4gICAgfVxuXG4gICAgaWYgKGNvdW50KSB7XG4gICAgICBsID0gTWF0aC5taW4oY291bnQgKiBzdHJpZGUgKyBvZmZzZXQsIGEubGVuZ3RoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbCA9IGEubGVuZ3RoO1xuICAgIH1cblxuICAgIGZvciAoaSA9IG9mZnNldDsgaSA8IGw7IGkgKz0gc3RyaWRlKSB7XG4gICAgICB2ZWNbMF0gPSBhW2ldO1xuICAgICAgdmVjWzFdID0gYVtpICsgMV07XG4gICAgICB2ZWNbMl0gPSBhW2kgKyAyXTtcbiAgICAgIHZlY1szXSA9IGFbaSArIDNdO1xuICAgICAgZm4odmVjLCB2ZWMsIGFyZyk7XG4gICAgICBhW2ldID0gdmVjWzBdO1xuICAgICAgYVtpICsgMV0gPSB2ZWNbMV07XG4gICAgICBhW2kgKyAyXSA9IHZlY1syXTtcbiAgICAgIGFbaSArIDNdID0gdmVjWzNdO1xuICAgIH1cblxuICAgIHJldHVybiBhO1xuICB9O1xufSgpO1xuXG5leHBvcnRzLmZvckVhY2ggPSBmb3JFYWNoOyIsIiFmdW5jdGlvbihlLHQpe1wib2JqZWN0XCI9PXR5cGVvZiBleHBvcnRzJiZcIm9iamVjdFwiPT10eXBlb2YgbW9kdWxlP21vZHVsZS5leHBvcnRzPXQoKTpcImZ1bmN0aW9uXCI9PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQ/ZGVmaW5lKFwiT0JKXCIsW10sdCk6XCJvYmplY3RcIj09dHlwZW9mIGV4cG9ydHM/ZXhwb3J0cy5PQko9dCgpOmUuT0JKPXQoKX0oXCJ1bmRlZmluZWRcIiE9dHlwZW9mIHNlbGY/c2VsZjp0aGlzLChmdW5jdGlvbigpe3JldHVybiBmdW5jdGlvbihlKXt2YXIgdD17fTtmdW5jdGlvbiBuKGEpe2lmKHRbYV0pcmV0dXJuIHRbYV0uZXhwb3J0czt2YXIgcz10W2FdPXtpOmEsbDohMSxleHBvcnRzOnt9fTtyZXR1cm4gZVthXS5jYWxsKHMuZXhwb3J0cyxzLHMuZXhwb3J0cyxuKSxzLmw9ITAscy5leHBvcnRzfXJldHVybiBuLm09ZSxuLmM9dCxuLmQ9ZnVuY3Rpb24oZSx0LGEpe24ubyhlLHQpfHxPYmplY3QuZGVmaW5lUHJvcGVydHkoZSx0LHtlbnVtZXJhYmxlOiEwLGdldDphfSl9LG4ucj1mdW5jdGlvbihlKXtcInVuZGVmaW5lZFwiIT10eXBlb2YgU3ltYm9sJiZTeW1ib2wudG9TdHJpbmdUYWcmJk9iamVjdC5kZWZpbmVQcm9wZXJ0eShlLFN5bWJvbC50b1N0cmluZ1RhZyx7dmFsdWU6XCJNb2R1bGVcIn0pLE9iamVjdC5kZWZpbmVQcm9wZXJ0eShlLFwiX19lc01vZHVsZVwiLHt2YWx1ZTohMH0pfSxuLnQ9ZnVuY3Rpb24oZSx0KXtpZigxJnQmJihlPW4oZSkpLDgmdClyZXR1cm4gZTtpZig0JnQmJlwib2JqZWN0XCI9PXR5cGVvZiBlJiZlJiZlLl9fZXNNb2R1bGUpcmV0dXJuIGU7dmFyIGE9T2JqZWN0LmNyZWF0ZShudWxsKTtpZihuLnIoYSksT2JqZWN0LmRlZmluZVByb3BlcnR5KGEsXCJkZWZhdWx0XCIse2VudW1lcmFibGU6ITAsdmFsdWU6ZX0pLDImdCYmXCJzdHJpbmdcIiE9dHlwZW9mIGUpZm9yKHZhciBzIGluIGUpbi5kKGEscyxmdW5jdGlvbih0KXtyZXR1cm4gZVt0XX0uYmluZChudWxsLHMpKTtyZXR1cm4gYX0sbi5uPWZ1bmN0aW9uKGUpe3ZhciB0PWUmJmUuX19lc01vZHVsZT9mdW5jdGlvbigpe3JldHVybiBlLmRlZmF1bHR9OmZ1bmN0aW9uKCl7cmV0dXJuIGV9O3JldHVybiBuLmQodCxcImFcIix0KSx0fSxuLm89ZnVuY3Rpb24oZSx0KXtyZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGUsdCl9LG4ucD1cIi9cIixuKG4ucz0wKX0oe1wiLi9zcmMvaW5kZXgudHNcIjpcbi8qISoqKioqKioqKioqKioqKioqKioqKiohKlxcXG4gICEqKiogLi9zcmMvaW5kZXgudHMgKioqIVxuICBcXCoqKioqKioqKioqKioqKioqKioqKiovXG4vKiEgZXhwb3J0cyBwcm92aWRlZDogQXR0cmlidXRlLCBEdXBsaWNhdGVBdHRyaWJ1dGVFeGNlcHRpb24sIExheW91dCwgTWF0ZXJpYWwsIE1hdGVyaWFsTGlicmFyeSwgTWVzaCwgVFlQRVMsIGRvd25sb2FkTW9kZWxzLCBkb3dubG9hZE1lc2hlcywgaW5pdE1lc2hCdWZmZXJzLCBkZWxldGVNZXNoQnVmZmVycywgdmVyc2lvbiAqL2Z1bmN0aW9uKG1vZHVsZSxfX3dlYnBhY2tfZXhwb3J0c19fLF9fd2VicGFja19yZXF1aXJlX18pe1widXNlIHN0cmljdFwiO2V2YWwoJ19fd2VicGFja19yZXF1aXJlX18ucihfX3dlYnBhY2tfZXhwb3J0c19fKTtcXG4vKiBoYXJtb255IGV4cG9ydCAoYmluZGluZykgKi8gX193ZWJwYWNrX3JlcXVpcmVfXy5kKF9fd2VicGFja19leHBvcnRzX18sIFwidmVyc2lvblwiLCBmdW5jdGlvbigpIHsgcmV0dXJuIHZlcnNpb247IH0pO1xcbi8qIGhhcm1vbnkgaW1wb3J0ICovIHZhciBfbWVzaF9fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fID0gX193ZWJwYWNrX3JlcXVpcmVfXygvKiEgLi9tZXNoICovIFwiLi9zcmMvbWVzaC50c1wiKTtcXG4vKiBoYXJtb255IHJlZXhwb3J0IChzYWZlKSAqLyBfX3dlYnBhY2tfcmVxdWlyZV9fLmQoX193ZWJwYWNrX2V4cG9ydHNfXywgXCJNZXNoXCIsIGZ1bmN0aW9uKCkgeyByZXR1cm4gX21lc2hfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfX1tcImRlZmF1bHRcIl07IH0pO1xcblxcbi8qIGhhcm1vbnkgaW1wb3J0ICovIHZhciBfbWF0ZXJpYWxfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzFfXyA9IF9fd2VicGFja19yZXF1aXJlX18oLyohIC4vbWF0ZXJpYWwgKi8gXCIuL3NyYy9tYXRlcmlhbC50c1wiKTtcXG4vKiBoYXJtb255IHJlZXhwb3J0IChzYWZlKSAqLyBfX3dlYnBhY2tfcmVxdWlyZV9fLmQoX193ZWJwYWNrX2V4cG9ydHNfXywgXCJNYXRlcmlhbFwiLCBmdW5jdGlvbigpIHsgcmV0dXJuIF9tYXRlcmlhbF9fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMV9fW1wiTWF0ZXJpYWxcIl07IH0pO1xcblxcbi8qIGhhcm1vbnkgcmVleHBvcnQgKHNhZmUpICovIF9fd2VicGFja19yZXF1aXJlX18uZChfX3dlYnBhY2tfZXhwb3J0c19fLCBcIk1hdGVyaWFsTGlicmFyeVwiLCBmdW5jdGlvbigpIHsgcmV0dXJuIF9tYXRlcmlhbF9fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMV9fW1wiTWF0ZXJpYWxMaWJyYXJ5XCJdOyB9KTtcXG5cXG4vKiBoYXJtb255IGltcG9ydCAqLyB2YXIgX2xheW91dF9fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMl9fID0gX193ZWJwYWNrX3JlcXVpcmVfXygvKiEgLi9sYXlvdXQgKi8gXCIuL3NyYy9sYXlvdXQudHNcIik7XFxuLyogaGFybW9ueSByZWV4cG9ydCAoc2FmZSkgKi8gX193ZWJwYWNrX3JlcXVpcmVfXy5kKF9fd2VicGFja19leHBvcnRzX18sIFwiQXR0cmlidXRlXCIsIGZ1bmN0aW9uKCkgeyByZXR1cm4gX2xheW91dF9fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMl9fW1wiQXR0cmlidXRlXCJdOyB9KTtcXG5cXG4vKiBoYXJtb255IHJlZXhwb3J0IChzYWZlKSAqLyBfX3dlYnBhY2tfcmVxdWlyZV9fLmQoX193ZWJwYWNrX2V4cG9ydHNfXywgXCJEdXBsaWNhdGVBdHRyaWJ1dGVFeGNlcHRpb25cIiwgZnVuY3Rpb24oKSB7IHJldHVybiBfbGF5b3V0X19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8yX19bXCJEdXBsaWNhdGVBdHRyaWJ1dGVFeGNlcHRpb25cIl07IH0pO1xcblxcbi8qIGhhcm1vbnkgcmVleHBvcnQgKHNhZmUpICovIF9fd2VicGFja19yZXF1aXJlX18uZChfX3dlYnBhY2tfZXhwb3J0c19fLCBcIkxheW91dFwiLCBmdW5jdGlvbigpIHsgcmV0dXJuIF9sYXlvdXRfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzJfX1tcIkxheW91dFwiXTsgfSk7XFxuXFxuLyogaGFybW9ueSByZWV4cG9ydCAoc2FmZSkgKi8gX193ZWJwYWNrX3JlcXVpcmVfXy5kKF9fd2VicGFja19leHBvcnRzX18sIFwiVFlQRVNcIiwgZnVuY3Rpb24oKSB7IHJldHVybiBfbGF5b3V0X19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8yX19bXCJUWVBFU1wiXTsgfSk7XFxuXFxuLyogaGFybW9ueSBpbXBvcnQgKi8gdmFyIF91dGlsc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfM19fID0gX193ZWJwYWNrX3JlcXVpcmVfXygvKiEgLi91dGlscyAqLyBcIi4vc3JjL3V0aWxzLnRzXCIpO1xcbi8qIGhhcm1vbnkgcmVleHBvcnQgKHNhZmUpICovIF9fd2VicGFja19yZXF1aXJlX18uZChfX3dlYnBhY2tfZXhwb3J0c19fLCBcImRvd25sb2FkTW9kZWxzXCIsIGZ1bmN0aW9uKCkgeyByZXR1cm4gX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8zX19bXCJkb3dubG9hZE1vZGVsc1wiXTsgfSk7XFxuXFxuLyogaGFybW9ueSByZWV4cG9ydCAoc2FmZSkgKi8gX193ZWJwYWNrX3JlcXVpcmVfXy5kKF9fd2VicGFja19leHBvcnRzX18sIFwiZG93bmxvYWRNZXNoZXNcIiwgZnVuY3Rpb24oKSB7IHJldHVybiBfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzNfX1tcImRvd25sb2FkTWVzaGVzXCJdOyB9KTtcXG5cXG4vKiBoYXJtb255IHJlZXhwb3J0IChzYWZlKSAqLyBfX3dlYnBhY2tfcmVxdWlyZV9fLmQoX193ZWJwYWNrX2V4cG9ydHNfXywgXCJpbml0TWVzaEJ1ZmZlcnNcIiwgZnVuY3Rpb24oKSB7IHJldHVybiBfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzNfX1tcImluaXRNZXNoQnVmZmVyc1wiXTsgfSk7XFxuXFxuLyogaGFybW9ueSByZWV4cG9ydCAoc2FmZSkgKi8gX193ZWJwYWNrX3JlcXVpcmVfXy5kKF9fd2VicGFja19leHBvcnRzX18sIFwiZGVsZXRlTWVzaEJ1ZmZlcnNcIiwgZnVuY3Rpb24oKSB7IHJldHVybiBfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzNfX1tcImRlbGV0ZU1lc2hCdWZmZXJzXCJdOyB9KTtcXG5cXG5cXG5cXG5cXG5cXG5jb25zdCB2ZXJzaW9uID0gXCIyLjAuM1wiO1xcbi8qKlxcbiAqIEBuYW1lc3BhY2VcXG4gKi9cXG5cXG5cXG5cXG4vLyMgc291cmNlVVJMPXdlYnBhY2s6Ly9PQkovLi9zcmMvaW5kZXgudHM/Jyl9LFwiLi9zcmMvbGF5b3V0LnRzXCI6XG4vKiEqKioqKioqKioqKioqKioqKioqKioqKiEqXFxcbiAgISoqKiAuL3NyYy9sYXlvdXQudHMgKioqIVxuICBcXCoqKioqKioqKioqKioqKioqKioqKioqL1xuLyohIGV4cG9ydHMgcHJvdmlkZWQ6IFRZUEVTLCBEdXBsaWNhdGVBdHRyaWJ1dGVFeGNlcHRpb24sIEF0dHJpYnV0ZSwgTGF5b3V0ICovZnVuY3Rpb24obW9kdWxlLF9fd2VicGFja19leHBvcnRzX18sX193ZWJwYWNrX3JlcXVpcmVfXyl7XCJ1c2Ugc3RyaWN0XCI7ZXZhbCgnX193ZWJwYWNrX3JlcXVpcmVfXy5yKF9fd2VicGFja19leHBvcnRzX18pO1xcbi8qIGhhcm1vbnkgZXhwb3J0IChiaW5kaW5nKSAqLyBfX3dlYnBhY2tfcmVxdWlyZV9fLmQoX193ZWJwYWNrX2V4cG9ydHNfXywgXCJUWVBFU1wiLCBmdW5jdGlvbigpIHsgcmV0dXJuIFRZUEVTOyB9KTtcXG4vKiBoYXJtb255IGV4cG9ydCAoYmluZGluZykgKi8gX193ZWJwYWNrX3JlcXVpcmVfXy5kKF9fd2VicGFja19leHBvcnRzX18sIFwiRHVwbGljYXRlQXR0cmlidXRlRXhjZXB0aW9uXCIsIGZ1bmN0aW9uKCkgeyByZXR1cm4gRHVwbGljYXRlQXR0cmlidXRlRXhjZXB0aW9uOyB9KTtcXG4vKiBoYXJtb255IGV4cG9ydCAoYmluZGluZykgKi8gX193ZWJwYWNrX3JlcXVpcmVfXy5kKF9fd2VicGFja19leHBvcnRzX18sIFwiQXR0cmlidXRlXCIsIGZ1bmN0aW9uKCkgeyByZXR1cm4gQXR0cmlidXRlOyB9KTtcXG4vKiBoYXJtb255IGV4cG9ydCAoYmluZGluZykgKi8gX193ZWJwYWNrX3JlcXVpcmVfXy5kKF9fd2VicGFja19leHBvcnRzX18sIFwiTGF5b3V0XCIsIGZ1bmN0aW9uKCkgeyByZXR1cm4gTGF5b3V0OyB9KTtcXG52YXIgVFlQRVM7XFxuKGZ1bmN0aW9uIChUWVBFUykge1xcbiAgICBUWVBFU1tcIkJZVEVcIl0gPSBcIkJZVEVcIjtcXG4gICAgVFlQRVNbXCJVTlNJR05FRF9CWVRFXCJdID0gXCJVTlNJR05FRF9CWVRFXCI7XFxuICAgIFRZUEVTW1wiU0hPUlRcIl0gPSBcIlNIT1JUXCI7XFxuICAgIFRZUEVTW1wiVU5TSUdORURfU0hPUlRcIl0gPSBcIlVOU0lHTkVEX1NIT1JUXCI7XFxuICAgIFRZUEVTW1wiRkxPQVRcIl0gPSBcIkZMT0FUXCI7XFxufSkoVFlQRVMgfHwgKFRZUEVTID0ge30pKTtcXG4vKipcXG4gKiBBbiBleGNlcHRpb24gZm9yIHdoZW4gdHdvIG9yIG1vcmUgb2YgdGhlIHNhbWUgYXR0cmlidXRlcyBhcmUgZm91bmQgaW4gdGhlXFxuICogc2FtZSBsYXlvdXQuXFxuICogQHByaXZhdGVcXG4gKi9cXG5jbGFzcyBEdXBsaWNhdGVBdHRyaWJ1dGVFeGNlcHRpb24gZXh0ZW5kcyBFcnJvciB7XFxuICAgIC8qKlxcbiAgICAgKiBDcmVhdGUgYSBEdXBsaWNhdGVBdHRyaWJ1dGVFeGNlcHRpb25cXG4gICAgICogQHBhcmFtIHtBdHRyaWJ1dGV9IGF0dHJpYnV0ZSAtIFRoZSBhdHRyaWJ1dGUgdGhhdCB3YXMgZm91bmQgbW9yZSB0aGFuXFxuICAgICAqICAgICAgICBvbmNlIGluIHRoZSB7QGxpbmsgTGF5b3V0fVxcbiAgICAgKi9cXG4gICAgY29uc3RydWN0b3IoYXR0cmlidXRlKSB7XFxuICAgICAgICBzdXBlcihgZm91bmQgZHVwbGljYXRlIGF0dHJpYnV0ZTogJHthdHRyaWJ1dGUua2V5fWApO1xcbiAgICB9XFxufVxcbi8qKlxcbiAqIFJlcHJlc2VudHMgaG93IGEgdmVydGV4IGF0dHJpYnV0ZSBzaG91bGQgYmUgcGFja2VkIGludG8gYW4gYnVmZmVyLlxcbiAqIEBwcml2YXRlXFxuICovXFxuY2xhc3MgQXR0cmlidXRlIHtcXG4gICAgLyoqXFxuICAgICAqIENyZWF0ZSBhbiBhdHRyaWJ1dGUuIERvIG5vdCBjYWxsIHRoaXMgZGlyZWN0bHksIHVzZSB0aGUgcHJlZGVmaW5lZFxcbiAgICAgKiBjb25zdGFudHMuXFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgLSBUaGUgbmFtZSBvZiB0aGlzIGF0dHJpYnV0ZSBhcyBpZiBpdCB3ZXJlIGEga2V5IGluXFxuICAgICAqICAgICAgICBhbiBPYmplY3QuIFVzZSB0aGUgY2FtZWwgY2FzZSB2ZXJzaW9uIG9mIHRoZSB1cHBlciBzbmFrZSBjYXNlXFxuICAgICAqICAgICAgICBjb25zdCBuYW1lLlxcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gc2l6ZSAtIFRoZSBudW1iZXIgb2YgY29tcG9uZW50cyBwZXIgdmVydGV4IGF0dHJpYnV0ZS5cXG4gICAgICogICAgICAgIE11c3QgYmUgMSwgMiwgMywgb3IgNC5cXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgLSBUaGUgZGF0YSB0eXBlIG9mIGVhY2ggY29tcG9uZW50IGZvciB0aGlzXFxuICAgICAqICAgICAgICBhdHRyaWJ1dGUuIFBvc3NpYmxlIHZhbHVlczo8YnIvPlxcbiAgICAgKiAgICAgICAgXCJCWVRFXCI6IHNpZ25lZCA4LWJpdCBpbnRlZ2VyLCB3aXRoIHZhbHVlcyBpbiBbLTEyOCwgMTI3XTxici8+XFxuICAgICAqICAgICAgICBcIlNIT1JUXCI6IHNpZ25lZCAxNi1iaXQgaW50ZWdlciwgd2l0aCB2YWx1ZXMgaW5cXG4gICAgICogICAgICAgICAgICBbLTMyNzY4LCAzMjc2N108YnIvPlxcbiAgICAgKiAgICAgICAgXCJVTlNJR05FRF9CWVRFXCI6IHVuc2lnbmVkIDgtYml0IGludGVnZXIsIHdpdGggdmFsdWVzIGluXFxuICAgICAqICAgICAgICAgICAgWzAsIDI1NV08YnIvPlxcbiAgICAgKiAgICAgICAgXCJVTlNJR05FRF9TSE9SVFwiOiB1bnNpZ25lZCAxNi1iaXQgaW50ZWdlciwgd2l0aCB2YWx1ZXMgaW5cXG4gICAgICogICAgICAgICAgICBbMCwgNjU1MzVdPGJyLz5cXG4gICAgICogICAgICAgIFwiRkxPQVRcIjogMzItYml0IGZsb2F0aW5nIHBvaW50IG51bWJlclxcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IG5vcm1hbGl6ZWQgLSBXaGV0aGVyIGludGVnZXIgZGF0YSB2YWx1ZXMgc2hvdWxkIGJlXFxuICAgICAqICAgICAgICBub3JtYWxpemVkIHdoZW4gYmVpbmcgY2FzdGVkIHRvIGEgZmxvYXQuPGJyLz5cXG4gICAgICogICAgICAgIElmIHRydWUsIHNpZ25lZCBpbnRlZ2VycyBhcmUgbm9ybWFsaXplZCB0byBbLTEsIDFdLjxici8+XFxuICAgICAqICAgICAgICBJZiB0cnVlLCB1bnNpZ25lZCBpbnRlZ2VycyBhcmUgbm9ybWFsaXplZCB0byBbMCwgMV0uPGJyLz5cXG4gICAgICogICAgICAgIEZvciB0eXBlIFwiRkxPQVRcIiwgdGhpcyBwYXJhbWV0ZXIgaGFzIG5vIGVmZmVjdC5cXG4gICAgICovXFxuICAgIGNvbnN0cnVjdG9yKGtleSwgc2l6ZSwgdHlwZSwgbm9ybWFsaXplZCA9IGZhbHNlKSB7XFxuICAgICAgICB0aGlzLmtleSA9IGtleTtcXG4gICAgICAgIHRoaXMuc2l6ZSA9IHNpemU7XFxuICAgICAgICB0aGlzLnR5cGUgPSB0eXBlO1xcbiAgICAgICAgdGhpcy5ub3JtYWxpemVkID0gbm9ybWFsaXplZDtcXG4gICAgICAgIHN3aXRjaCAodHlwZSkge1xcbiAgICAgICAgICAgIGNhc2UgXCJCWVRFXCI6XFxuICAgICAgICAgICAgY2FzZSBcIlVOU0lHTkVEX0JZVEVcIjpcXG4gICAgICAgICAgICAgICAgdGhpcy5zaXplT2ZUeXBlID0gMTtcXG4gICAgICAgICAgICAgICAgYnJlYWs7XFxuICAgICAgICAgICAgY2FzZSBcIlNIT1JUXCI6XFxuICAgICAgICAgICAgY2FzZSBcIlVOU0lHTkVEX1NIT1JUXCI6XFxuICAgICAgICAgICAgICAgIHRoaXMuc2l6ZU9mVHlwZSA9IDI7XFxuICAgICAgICAgICAgICAgIGJyZWFrO1xcbiAgICAgICAgICAgIGNhc2UgXCJGTE9BVFwiOlxcbiAgICAgICAgICAgICAgICB0aGlzLnNpemVPZlR5cGUgPSA0O1xcbiAgICAgICAgICAgICAgICBicmVhaztcXG4gICAgICAgICAgICBkZWZhdWx0OlxcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gZ2wgdHlwZTogJHt0eXBlfWApO1xcbiAgICAgICAgfVxcbiAgICAgICAgdGhpcy5zaXplSW5CeXRlcyA9IHRoaXMuc2l6ZU9mVHlwZSAqIHNpemU7XFxuICAgIH1cXG59XFxuLyoqXFxuICogQSBjbGFzcyB0byByZXByZXNlbnQgdGhlIG1lbW9yeSBsYXlvdXQgZm9yIGEgdmVydGV4IGF0dHJpYnV0ZSBhcnJheS4gVXNlZCBieVxcbiAqIHtAbGluayBNZXNofVxcJ3MgVEJEKC4uLikgbWV0aG9kIHRvIGdlbmVyYXRlIGEgcGFja2VkIGFycmF5IGZyb20gbWVzaCBkYXRhLlxcbiAqIDxwPlxcbiAqIExheW91dCBjYW4gc29ydCBvZiBiZSB0aG91Z2h0IG9mIGFzIGEgQy1zdHlsZSBzdHJ1Y3QgZGVjbGFyYXRpb24uXFxuICoge0BsaW5rIE1lc2h9XFwncyBUQkQoLi4uKSBtZXRob2Qgd2lsbCB1c2UgdGhlIHtAbGluayBMYXlvdXR9IGluc3RhbmNlIHRvXFxuICogcGFjayBhbiBhcnJheSBpbiB0aGUgZ2l2ZW4gYXR0cmlidXRlIG9yZGVyLlxcbiAqIDxwPlxcbiAqIExheW91dCBhbHNvIGlzIHZlcnkgaGVscGZ1bCB3aGVuIGNhbGxpbmcgYSBXZWJHTCBjb250ZXh0XFwnc1xcbiAqIDxjb2RlPnZlcnRleEF0dHJpYlBvaW50ZXI8L2NvZGU+IG1ldGhvZC4gSWYgeW91XFwndmUgY3JlYXRlZCBhIGJ1ZmZlciB1c2luZ1xcbiAqIGEgTGF5b3V0IGluc3RhbmNlLCB0aGVuIHRoZSBzYW1lIExheW91dCBpbnN0YW5jZSBjYW4gYmUgdXNlZCB0byBkZXRlcm1pbmVcXG4gKiB0aGUgc2l6ZSwgdHlwZSwgbm9ybWFsaXplZCwgc3RyaWRlLCBhbmQgb2Zmc2V0IHBhcmFtZXRlcnMgZm9yXFxuICogPGNvZGU+dmVydGV4QXR0cmliUG9pbnRlcjwvY29kZT4uXFxuICogPHA+XFxuICogRm9yIGV4YW1wbGU6XFxuICogPHByZT48Y29kZT5cXG4gKlxcbiAqIGNvbnN0IGluZGV4ID0gZ2xjdHguZ2V0QXR0cmliTG9jYXRpb24oc2hhZGVyUHJvZ3JhbSwgXCJwb3NcIik7XFxuICogZ2xjdHgudmVydGV4QXR0cmliUG9pbnRlcihcXG4gKiAgIGxheW91dC5wb3NpdGlvbi5zaXplLFxcbiAqICAgZ2xjdHhbbGF5b3V0LnBvc2l0aW9uLnR5cGVdLFxcbiAqICAgbGF5b3V0LnBvc2l0aW9uLm5vcm1hbGl6ZWQsXFxuICogICBsYXlvdXQucG9zaXRpb24uc3RyaWRlLFxcbiAqICAgbGF5b3V0LnBvc2l0aW9uLm9mZnNldCk7XFxuICogPC9jb2RlPjwvcHJlPlxcbiAqIEBzZWUge0BsaW5rIE1lc2h9XFxuICovXFxuY2xhc3MgTGF5b3V0IHtcXG4gICAgLyoqXFxuICAgICAqIENyZWF0ZSBhIExheW91dCBvYmplY3QuIFRoaXMgY29uc3RydWN0b3Igd2lsbCB0aHJvdyBpZiBhbnkgZHVwbGljYXRlXFxuICAgICAqIGF0dHJpYnV0ZXMgYXJlIGdpdmVuLlxcbiAgICAgKiBAcGFyYW0ge0FycmF5fSAuLi5hdHRyaWJ1dGVzIC0gQW4gb3JkZXJlZCBsaXN0IG9mIGF0dHJpYnV0ZXMgdGhhdFxcbiAgICAgKiAgICAgICAgZGVzY3JpYmUgdGhlIGRlc2lyZWQgbWVtb3J5IGxheW91dCBmb3IgZWFjaCB2ZXJ0ZXggYXR0cmlidXRlLlxcbiAgICAgKiAgICAgICAgPHA+XFxuICAgICAqXFxuICAgICAqIEBzZWUge0BsaW5rIE1lc2h9XFxuICAgICAqL1xcbiAgICBjb25zdHJ1Y3RvciguLi5hdHRyaWJ1dGVzKSB7XFxuICAgICAgICB0aGlzLmF0dHJpYnV0ZXMgPSBhdHRyaWJ1dGVzO1xcbiAgICAgICAgdGhpcy5hdHRyaWJ1dGVNYXAgPSB7fTtcXG4gICAgICAgIGxldCBvZmZzZXQgPSAwO1xcbiAgICAgICAgbGV0IG1heFN0cmlkZU11bHRpcGxlID0gMDtcXG4gICAgICAgIGZvciAoY29uc3QgYXR0cmlidXRlIG9mIGF0dHJpYnV0ZXMpIHtcXG4gICAgICAgICAgICBpZiAodGhpcy5hdHRyaWJ1dGVNYXBbYXR0cmlidXRlLmtleV0pIHtcXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IER1cGxpY2F0ZUF0dHJpYnV0ZUV4Y2VwdGlvbihhdHRyaWJ1dGUpO1xcbiAgICAgICAgICAgIH1cXG4gICAgICAgICAgICAvLyBBZGQgcGFkZGluZyB0byBzYXRpc2Z5IFdlYkdMXFwncyByZXF1aXJlbWVudCB0aGF0IGFsbFxcbiAgICAgICAgICAgIC8vIHZlcnRleEF0dHJpYlBvaW50ZXIgY2FsbHMgaGF2ZSBhbiBvZmZzZXQgdGhhdCBpcyBhIG11bHRpcGxlIG9mXFxuICAgICAgICAgICAgLy8gdGhlIHR5cGUgc2l6ZS5cXG4gICAgICAgICAgICBpZiAob2Zmc2V0ICUgYXR0cmlidXRlLnNpemVPZlR5cGUgIT09IDApIHtcXG4gICAgICAgICAgICAgICAgb2Zmc2V0ICs9IGF0dHJpYnV0ZS5zaXplT2ZUeXBlIC0gKG9mZnNldCAlIGF0dHJpYnV0ZS5zaXplT2ZUeXBlKTtcXG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwiTGF5b3V0IHJlcXVpcmVzIHBhZGRpbmcgYmVmb3JlIFwiICsgYXR0cmlidXRlLmtleSArIFwiIGF0dHJpYnV0ZVwiKTtcXG4gICAgICAgICAgICB9XFxuICAgICAgICAgICAgdGhpcy5hdHRyaWJ1dGVNYXBbYXR0cmlidXRlLmtleV0gPSB7XFxuICAgICAgICAgICAgICAgIGF0dHJpYnV0ZTogYXR0cmlidXRlLFxcbiAgICAgICAgICAgICAgICBzaXplOiBhdHRyaWJ1dGUuc2l6ZSxcXG4gICAgICAgICAgICAgICAgdHlwZTogYXR0cmlidXRlLnR5cGUsXFxuICAgICAgICAgICAgICAgIG5vcm1hbGl6ZWQ6IGF0dHJpYnV0ZS5ub3JtYWxpemVkLFxcbiAgICAgICAgICAgICAgICBvZmZzZXQ6IG9mZnNldCxcXG4gICAgICAgICAgICB9O1xcbiAgICAgICAgICAgIG9mZnNldCArPSBhdHRyaWJ1dGUuc2l6ZUluQnl0ZXM7XFxuICAgICAgICAgICAgbWF4U3RyaWRlTXVsdGlwbGUgPSBNYXRoLm1heChtYXhTdHJpZGVNdWx0aXBsZSwgYXR0cmlidXRlLnNpemVPZlR5cGUpO1xcbiAgICAgICAgfVxcbiAgICAgICAgLy8gQWRkIHBhZGRpbmcgdG8gdGhlIGVuZCB0byBzYXRpc2Z5IFdlYkdMXFwncyByZXF1aXJlbWVudCB0aGF0IGFsbFxcbiAgICAgICAgLy8gdmVydGV4QXR0cmliUG9pbnRlciBjYWxscyBoYXZlIGEgc3RyaWRlIHRoYXQgaXMgYSBtdWx0aXBsZSBvZiB0aGVcXG4gICAgICAgIC8vIHR5cGUgc2l6ZS4gQmVjYXVzZSB3ZVxcJ3JlIHB1dHRpbmcgZGlmZmVyZW50bHkgc2l6ZWQgYXR0cmlidXRlcyBpbnRvXFxuICAgICAgICAvLyB0aGUgc2FtZSBidWZmZXIsIGl0IG11c3QgYmUgcGFkZGVkIHRvIGEgbXVsdGlwbGUgb2YgdGhlIGxhcmdlc3RcXG4gICAgICAgIC8vIHR5cGUgc2l6ZS5cXG4gICAgICAgIGlmIChvZmZzZXQgJSBtYXhTdHJpZGVNdWx0aXBsZSAhPT0gMCkge1xcbiAgICAgICAgICAgIG9mZnNldCArPSBtYXhTdHJpZGVNdWx0aXBsZSAtIChvZmZzZXQgJSBtYXhTdHJpZGVNdWx0aXBsZSk7XFxuICAgICAgICAgICAgY29uc29sZS53YXJuKFwiTGF5b3V0IHJlcXVpcmVzIHBhZGRpbmcgYXQgdGhlIGJhY2tcIik7XFxuICAgICAgICB9XFxuICAgICAgICB0aGlzLnN0cmlkZSA9IG9mZnNldDtcXG4gICAgICAgIGZvciAoY29uc3QgYXR0cmlidXRlIG9mIGF0dHJpYnV0ZXMpIHtcXG4gICAgICAgICAgICB0aGlzLmF0dHJpYnV0ZU1hcFthdHRyaWJ1dGUua2V5XS5zdHJpZGUgPSB0aGlzLnN0cmlkZTtcXG4gICAgICAgIH1cXG4gICAgfVxcbn1cXG4vLyBHZW9tZXRyeSBhdHRyaWJ1dGVzXFxuLyoqXFxuICogQXR0cmlidXRlIGxheW91dCB0byBwYWNrIGEgdmVydGV4XFwncyB4LCB5LCAmIHogYXMgZmxvYXRzXFxuICpcXG4gKiBAc2VlIHtAbGluayBMYXlvdXR9XFxuICovXFxuTGF5b3V0LlBPU0lUSU9OID0gbmV3IEF0dHJpYnV0ZShcInBvc2l0aW9uXCIsIDMsIFRZUEVTLkZMT0FUKTtcXG4vKipcXG4gKiBBdHRyaWJ1dGUgbGF5b3V0IHRvIHBhY2sgYSB2ZXJ0ZXhcXCdzIG5vcm1hbFxcJ3MgeCwgeSwgJiB6IGFzIGZsb2F0c1xcbiAqXFxuICogQHNlZSB7QGxpbmsgTGF5b3V0fVxcbiAqL1xcbkxheW91dC5OT1JNQUwgPSBuZXcgQXR0cmlidXRlKFwibm9ybWFsXCIsIDMsIFRZUEVTLkZMT0FUKTtcXG4vKipcXG4gKiBBdHRyaWJ1dGUgbGF5b3V0IHRvIHBhY2sgYSB2ZXJ0ZXhcXCdzIG5vcm1hbFxcJ3MgeCwgeSwgJiB6IGFzIGZsb2F0cy5cXG4gKiA8cD5cXG4gKiBUaGlzIHZhbHVlIHdpbGwgYmUgY29tcHV0ZWQgb24tdGhlLWZseSBiYXNlZCBvbiB0aGUgdGV4dHVyZSBjb29yZGluYXRlcy5cXG4gKiBJZiBubyB0ZXh0dXJlIGNvb3JkaW5hdGVzIGFyZSBhdmFpbGFibGUsIHRoZSBnZW5lcmF0ZWQgdmFsdWUgd2lsbCBkZWZhdWx0IHRvXFxuICogMCwgMCwgMC5cXG4gKlxcbiAqIEBzZWUge0BsaW5rIExheW91dH1cXG4gKi9cXG5MYXlvdXQuVEFOR0VOVCA9IG5ldyBBdHRyaWJ1dGUoXCJ0YW5nZW50XCIsIDMsIFRZUEVTLkZMT0FUKTtcXG4vKipcXG4gKiBBdHRyaWJ1dGUgbGF5b3V0IHRvIHBhY2sgYSB2ZXJ0ZXhcXCdzIG5vcm1hbFxcJ3MgYml0YW5nZW50IHgsIHksICYgeiBhcyBmbG9hdHMuXFxuICogPHA+XFxuICogVGhpcyB2YWx1ZSB3aWxsIGJlIGNvbXB1dGVkIG9uLXRoZS1mbHkgYmFzZWQgb24gdGhlIHRleHR1cmUgY29vcmRpbmF0ZXMuXFxuICogSWYgbm8gdGV4dHVyZSBjb29yZGluYXRlcyBhcmUgYXZhaWxhYmxlLCB0aGUgZ2VuZXJhdGVkIHZhbHVlIHdpbGwgZGVmYXVsdCB0b1xcbiAqIDAsIDAsIDAuXFxuICogQHNlZSB7QGxpbmsgTGF5b3V0fVxcbiAqL1xcbkxheW91dC5CSVRBTkdFTlQgPSBuZXcgQXR0cmlidXRlKFwiYml0YW5nZW50XCIsIDMsIFRZUEVTLkZMT0FUKTtcXG4vKipcXG4gKiBBdHRyaWJ1dGUgbGF5b3V0IHRvIHBhY2sgYSB2ZXJ0ZXhcXCdzIHRleHR1cmUgY29vcmRpbmF0ZXNcXCcgdSAmIHYgYXMgZmxvYXRzXFxuICpcXG4gKiBAc2VlIHtAbGluayBMYXlvdXR9XFxuICovXFxuTGF5b3V0LlVWID0gbmV3IEF0dHJpYnV0ZShcInV2XCIsIDIsIFRZUEVTLkZMT0FUKTtcXG4vLyBNYXRlcmlhbCBhdHRyaWJ1dGVzXFxuLyoqXFxuICogQXR0cmlidXRlIGxheW91dCB0byBwYWNrIGFuIHVuc2lnbmVkIHNob3J0IHRvIGJlIGludGVycHJldGVkIGFzIGEgdGhlIGluZGV4XFxuICogaW50byBhIHtAbGluayBNZXNofVxcJ3MgbWF0ZXJpYWxzIGxpc3QuXFxuICogPHA+XFxuICogVGhlIGludGVudGlvbiBvZiB0aGlzIHZhbHVlIGlzIHRvIHNlbmQgYWxsIG9mIHRoZSB7QGxpbmsgTWVzaH1cXCdzIG1hdGVyaWFsc1xcbiAqIGludG8gbXVsdGlwbGUgc2hhZGVyIHVuaWZvcm1zIGFuZCB0aGVuIHJlZmVyZW5jZSB0aGUgY3VycmVudCBvbmUgYnkgdGhpc1xcbiAqIHZlcnRleCBhdHRyaWJ1dGUuXFxuICogPHA+XFxuICogZXhhbXBsZSBnbHNsIGNvZGU6XFxuICpcXG4gKiA8cHJlPjxjb2RlPlxcbiAqICAvLyB0aGlzIGlzIGJvdW5kIHVzaW5nIE1BVEVSSUFMX0lOREVYXFxuICogIGF0dHJpYnV0ZSBpbnQgbWF0ZXJpYWxJbmRleDtcXG4gKlxcbiAqICBzdHJ1Y3QgTWF0ZXJpYWwge1xcbiAqICAgIHZlYzMgZGlmZnVzZTtcXG4gKiAgICB2ZWMzIHNwZWN1bGFyO1xcbiAqICAgIHZlYzMgc3BlY3VsYXJFeHBvbmVudDtcXG4gKiAgfTtcXG4gKlxcbiAqICB1bmlmb3JtIE1hdGVyaWFsIG1hdGVyaWFsc1tNQVhfTUFURVJJQUxTXTtcXG4gKlxcbiAqICAvLyAuLi5cXG4gKlxcbiAqICB2ZWMzIGRpZmZ1c2UgPSBtYXRlcmlhbHNbbWF0ZXJpYWxJbmRleF07XFxuICpcXG4gKiA8L2NvZGU+PC9wcmU+XFxuICogVE9ETzogTW9yZSBkZXNjcmlwdGlvbiAmIHRlc3QgdG8gbWFrZSBzdXJlIHN1YnNjcmlwdGluZyBieSBhdHRyaWJ1dGVzIGV2ZW5cXG4gKiB3b3JrcyBmb3Igd2ViZ2xcXG4gKlxcbiAqIEBzZWUge0BsaW5rIExheW91dH1cXG4gKi9cXG5MYXlvdXQuTUFURVJJQUxfSU5ERVggPSBuZXcgQXR0cmlidXRlKFwibWF0ZXJpYWxJbmRleFwiLCAxLCBUWVBFUy5TSE9SVCk7XFxuTGF5b3V0Lk1BVEVSSUFMX0VOQUJMRUQgPSBuZXcgQXR0cmlidXRlKFwibWF0ZXJpYWxFbmFibGVkXCIsIDEsIFRZUEVTLlVOU0lHTkVEX1NIT1JUKTtcXG5MYXlvdXQuQU1CSUVOVCA9IG5ldyBBdHRyaWJ1dGUoXCJhbWJpZW50XCIsIDMsIFRZUEVTLkZMT0FUKTtcXG5MYXlvdXQuRElGRlVTRSA9IG5ldyBBdHRyaWJ1dGUoXCJkaWZmdXNlXCIsIDMsIFRZUEVTLkZMT0FUKTtcXG5MYXlvdXQuU1BFQ1VMQVIgPSBuZXcgQXR0cmlidXRlKFwic3BlY3VsYXJcIiwgMywgVFlQRVMuRkxPQVQpO1xcbkxheW91dC5TUEVDVUxBUl9FWFBPTkVOVCA9IG5ldyBBdHRyaWJ1dGUoXCJzcGVjdWxhckV4cG9uZW50XCIsIDMsIFRZUEVTLkZMT0FUKTtcXG5MYXlvdXQuRU1JU1NJVkUgPSBuZXcgQXR0cmlidXRlKFwiZW1pc3NpdmVcIiwgMywgVFlQRVMuRkxPQVQpO1xcbkxheW91dC5UUkFOU01JU1NJT05fRklMVEVSID0gbmV3IEF0dHJpYnV0ZShcInRyYW5zbWlzc2lvbkZpbHRlclwiLCAzLCBUWVBFUy5GTE9BVCk7XFxuTGF5b3V0LkRJU1NPTFZFID0gbmV3IEF0dHJpYnV0ZShcImRpc3NvbHZlXCIsIDEsIFRZUEVTLkZMT0FUKTtcXG5MYXlvdXQuSUxMVU1JTkFUSU9OID0gbmV3IEF0dHJpYnV0ZShcImlsbHVtaW5hdGlvblwiLCAxLCBUWVBFUy5VTlNJR05FRF9TSE9SVCk7XFxuTGF5b3V0LlJFRlJBQ1RJT05fSU5ERVggPSBuZXcgQXR0cmlidXRlKFwicmVmcmFjdGlvbkluZGV4XCIsIDEsIFRZUEVTLkZMT0FUKTtcXG5MYXlvdXQuU0hBUlBORVNTID0gbmV3IEF0dHJpYnV0ZShcInNoYXJwbmVzc1wiLCAxLCBUWVBFUy5GTE9BVCk7XFxuTGF5b3V0Lk1BUF9ESUZGVVNFID0gbmV3IEF0dHJpYnV0ZShcIm1hcERpZmZ1c2VcIiwgMSwgVFlQRVMuU0hPUlQpO1xcbkxheW91dC5NQVBfQU1CSUVOVCA9IG5ldyBBdHRyaWJ1dGUoXCJtYXBBbWJpZW50XCIsIDEsIFRZUEVTLlNIT1JUKTtcXG5MYXlvdXQuTUFQX1NQRUNVTEFSID0gbmV3IEF0dHJpYnV0ZShcIm1hcFNwZWN1bGFyXCIsIDEsIFRZUEVTLlNIT1JUKTtcXG5MYXlvdXQuTUFQX1NQRUNVTEFSX0VYUE9ORU5UID0gbmV3IEF0dHJpYnV0ZShcIm1hcFNwZWN1bGFyRXhwb25lbnRcIiwgMSwgVFlQRVMuU0hPUlQpO1xcbkxheW91dC5NQVBfRElTU09MVkUgPSBuZXcgQXR0cmlidXRlKFwibWFwRGlzc29sdmVcIiwgMSwgVFlQRVMuU0hPUlQpO1xcbkxheW91dC5BTlRJX0FMSUFTSU5HID0gbmV3IEF0dHJpYnV0ZShcImFudGlBbGlhc2luZ1wiLCAxLCBUWVBFUy5VTlNJR05FRF9TSE9SVCk7XFxuTGF5b3V0Lk1BUF9CVU1QID0gbmV3IEF0dHJpYnV0ZShcIm1hcEJ1bXBcIiwgMSwgVFlQRVMuU0hPUlQpO1xcbkxheW91dC5NQVBfRElTUExBQ0VNRU5UID0gbmV3IEF0dHJpYnV0ZShcIm1hcERpc3BsYWNlbWVudFwiLCAxLCBUWVBFUy5TSE9SVCk7XFxuTGF5b3V0Lk1BUF9ERUNBTCA9IG5ldyBBdHRyaWJ1dGUoXCJtYXBEZWNhbFwiLCAxLCBUWVBFUy5TSE9SVCk7XFxuTGF5b3V0Lk1BUF9FTUlTU0lWRSA9IG5ldyBBdHRyaWJ1dGUoXCJtYXBFbWlzc2l2ZVwiLCAxLCBUWVBFUy5TSE9SVCk7XFxuXFxuXFxuLy8jIHNvdXJjZVVSTD13ZWJwYWNrOi8vT0JKLy4vc3JjL2xheW91dC50cz8nKX0sXCIuL3NyYy9tYXRlcmlhbC50c1wiOlxuLyohKioqKioqKioqKioqKioqKioqKioqKioqKiEqXFxcbiAgISoqKiAuL3NyYy9tYXRlcmlhbC50cyAqKiohXG4gIFxcKioqKioqKioqKioqKioqKioqKioqKioqKi9cbi8qISBleHBvcnRzIHByb3ZpZGVkOiBNYXRlcmlhbCwgTWF0ZXJpYWxMaWJyYXJ5ICovZnVuY3Rpb24obW9kdWxlLF9fd2VicGFja19leHBvcnRzX18sX193ZWJwYWNrX3JlcXVpcmVfXyl7XCJ1c2Ugc3RyaWN0XCI7ZXZhbCgnX193ZWJwYWNrX3JlcXVpcmVfXy5yKF9fd2VicGFja19leHBvcnRzX18pO1xcbi8qIGhhcm1vbnkgZXhwb3J0IChiaW5kaW5nKSAqLyBfX3dlYnBhY2tfcmVxdWlyZV9fLmQoX193ZWJwYWNrX2V4cG9ydHNfXywgXCJNYXRlcmlhbFwiLCBmdW5jdGlvbigpIHsgcmV0dXJuIE1hdGVyaWFsOyB9KTtcXG4vKiBoYXJtb255IGV4cG9ydCAoYmluZGluZykgKi8gX193ZWJwYWNrX3JlcXVpcmVfXy5kKF9fd2VicGFja19leHBvcnRzX18sIFwiTWF0ZXJpYWxMaWJyYXJ5XCIsIGZ1bmN0aW9uKCkgeyByZXR1cm4gTWF0ZXJpYWxMaWJyYXJ5OyB9KTtcXG4vKipcXG4gKiBUaGUgTWF0ZXJpYWwgY2xhc3MuXFxuICovXFxuY2xhc3MgTWF0ZXJpYWwge1xcbiAgICBjb25zdHJ1Y3RvcihuYW1lKSB7XFxuICAgICAgICB0aGlzLm5hbWUgPSBuYW1lO1xcbiAgICAgICAgLyoqXFxuICAgICAgICAgKiBDb25zdHJ1Y3RvclxcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgdGhlIHVuaXF1ZSBuYW1lIG9mIHRoZSBtYXRlcmlhbFxcbiAgICAgICAgICovXFxuICAgICAgICAvLyBUaGUgdmFsdWVzIGZvciB0aGUgZm9sbG93aW5nIGF0dGlidXRlc1xcbiAgICAgICAgLy8gYXJlIGFuIGFycmF5IG9mIFIsIEcsIEIgbm9ybWFsaXplZCB2YWx1ZXMuXFxuICAgICAgICAvLyBLYSAtIEFtYmllbnQgUmVmbGVjdGl2aXR5XFxuICAgICAgICB0aGlzLmFtYmllbnQgPSBbMCwgMCwgMF07XFxuICAgICAgICAvLyBLZCAtIERlZnVzZSBSZWZsZWN0aXZpdHlcXG4gICAgICAgIHRoaXMuZGlmZnVzZSA9IFswLCAwLCAwXTtcXG4gICAgICAgIC8vIEtzXFxuICAgICAgICB0aGlzLnNwZWN1bGFyID0gWzAsIDAsIDBdO1xcbiAgICAgICAgLy8gS2VcXG4gICAgICAgIHRoaXMuZW1pc3NpdmUgPSBbMCwgMCwgMF07XFxuICAgICAgICAvLyBUZlxcbiAgICAgICAgdGhpcy50cmFuc21pc3Npb25GaWx0ZXIgPSBbMCwgMCwgMF07XFxuICAgICAgICAvLyBkXFxuICAgICAgICB0aGlzLmRpc3NvbHZlID0gMDtcXG4gICAgICAgIC8vIHZhbGlkIHJhbmdlIGlzIGJldHdlZW4gMCBhbmQgMTAwMFxcbiAgICAgICAgdGhpcy5zcGVjdWxhckV4cG9uZW50ID0gMDtcXG4gICAgICAgIC8vIGVpdGhlciBkIG9yIFRyOyB2YWxpZCB2YWx1ZXMgYXJlIG5vcm1hbGl6ZWRcXG4gICAgICAgIHRoaXMudHJhbnNwYXJlbmN5ID0gMDtcXG4gICAgICAgIC8vIGlsbHVtIC0gdGhlIGVudW0gb2YgdGhlIGlsbHVtaW5hdGlvbiBtb2RlbCB0byB1c2VcXG4gICAgICAgIHRoaXMuaWxsdW1pbmF0aW9uID0gMDtcXG4gICAgICAgIC8vIE5pIC0gU2V0IHRvIFwibm9ybWFsXCIgKGFpcikuXFxuICAgICAgICB0aGlzLnJlZnJhY3Rpb25JbmRleCA9IDE7XFxuICAgICAgICAvLyBzaGFycG5lc3NcXG4gICAgICAgIHRoaXMuc2hhcnBuZXNzID0gMDtcXG4gICAgICAgIC8vIG1hcF9LZFxcbiAgICAgICAgdGhpcy5tYXBEaWZmdXNlID0gZW1wdHlUZXh0dXJlT3B0aW9ucygpO1xcbiAgICAgICAgLy8gbWFwX0thXFxuICAgICAgICB0aGlzLm1hcEFtYmllbnQgPSBlbXB0eVRleHR1cmVPcHRpb25zKCk7XFxuICAgICAgICAvLyBtYXBfS3NcXG4gICAgICAgIHRoaXMubWFwU3BlY3VsYXIgPSBlbXB0eVRleHR1cmVPcHRpb25zKCk7XFxuICAgICAgICAvLyBtYXBfTnNcXG4gICAgICAgIHRoaXMubWFwU3BlY3VsYXJFeHBvbmVudCA9IGVtcHR5VGV4dHVyZU9wdGlvbnMoKTtcXG4gICAgICAgIC8vIG1hcF9kXFxuICAgICAgICB0aGlzLm1hcERpc3NvbHZlID0gZW1wdHlUZXh0dXJlT3B0aW9ucygpO1xcbiAgICAgICAgLy8gbWFwX2FhdFxcbiAgICAgICAgdGhpcy5hbnRpQWxpYXNpbmcgPSBmYWxzZTtcXG4gICAgICAgIC8vIG1hcF9idW1wIG9yIGJ1bXBcXG4gICAgICAgIHRoaXMubWFwQnVtcCA9IGVtcHR5VGV4dHVyZU9wdGlvbnMoKTtcXG4gICAgICAgIC8vIGRpc3BcXG4gICAgICAgIHRoaXMubWFwRGlzcGxhY2VtZW50ID0gZW1wdHlUZXh0dXJlT3B0aW9ucygpO1xcbiAgICAgICAgLy8gZGVjYWxcXG4gICAgICAgIHRoaXMubWFwRGVjYWwgPSBlbXB0eVRleHR1cmVPcHRpb25zKCk7XFxuICAgICAgICAvLyBtYXBfS2VcXG4gICAgICAgIHRoaXMubWFwRW1pc3NpdmUgPSBlbXB0eVRleHR1cmVPcHRpb25zKCk7XFxuICAgICAgICAvLyByZWZsIC0gd2hlbiB0aGUgcmVmbGVjdGlvbiB0eXBlIGlzIGEgY3ViZSwgdGhlcmUgd2lsbCBiZSBtdWx0aXBsZSByZWZsXFxuICAgICAgICAvLyAgICAgICAgc3RhdGVtZW50cyBmb3IgZWFjaCBzaWRlIG9mIHRoZSBjdWJlLiBJZiBpdFxcJ3MgYSBzcGhlcmljYWxcXG4gICAgICAgIC8vICAgICAgICByZWZsZWN0aW9uLCB0aGVyZSBzaG91bGQgb25seSBldmVyIGJlIG9uZS5cXG4gICAgICAgIHRoaXMubWFwUmVmbGVjdGlvbnMgPSBbXTtcXG4gICAgfVxcbn1cXG5jb25zdCBTRU5USU5FTF9NQVRFUklBTCA9IG5ldyBNYXRlcmlhbChcInNlbnRpbmVsXCIpO1xcbi8qKlxcbiAqIGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1dhdmVmcm9udF8ub2JqX2ZpbGVcXG4gKiBodHRwOi8vcGF1bGJvdXJrZS5uZXQvZGF0YWZvcm1hdHMvbXRsL1xcbiAqL1xcbmNsYXNzIE1hdGVyaWFsTGlicmFyeSB7XFxuICAgIGNvbnN0cnVjdG9yKGRhdGEpIHtcXG4gICAgICAgIHRoaXMuZGF0YSA9IGRhdGE7XFxuICAgICAgICAvKipcXG4gICAgICAgICAqIENvbnN0cnVjdHMgdGhlIE1hdGVyaWFsIFBhcnNlclxcbiAgICAgICAgICogQHBhcmFtIG10bERhdGEgdGhlIE1UTCBmaWxlIGNvbnRlbnRzXFxuICAgICAgICAgKi9cXG4gICAgICAgIHRoaXMuY3VycmVudE1hdGVyaWFsID0gU0VOVElORUxfTUFURVJJQUw7XFxuICAgICAgICB0aGlzLm1hdGVyaWFscyA9IHt9O1xcbiAgICAgICAgdGhpcy5wYXJzZSgpO1xcbiAgICB9XFxuICAgIC8qIGVzbGludC1kaXNhYmxlIGNhbWVsY2FzZSAqL1xcbiAgICAvKiB0aGUgZnVuY3Rpb24gbmFtZXMgaGVyZSBkaXNvYmV5IGNhbWVsQ2FzZSBjb252ZW50aW9uc1xcbiAgICAgdG8gbWFrZSBwYXJzaW5nL3JvdXRpbmcgZWFzaWVyLiBzZWUgdGhlIHBhcnNlIGZ1bmN0aW9uXFxuICAgICBkb2N1bWVudGF0aW9uIGZvciBtb3JlIGluZm9ybWF0aW9uLiAqL1xcbiAgICAvKipcXG4gICAgICogQ3JlYXRlcyBhIG5ldyBNYXRlcmlhbCBvYmplY3QgYW5kIGFkZHMgdG8gdGhlIHJlZ2lzdHJ5LlxcbiAgICAgKiBAcGFyYW0gdG9rZW5zIHRoZSB0b2tlbnMgYXNzb2NpYXRlZCB3aXRoIHRoZSBkaXJlY3RpdmVcXG4gICAgICovXFxuICAgIHBhcnNlX25ld210bCh0b2tlbnMpIHtcXG4gICAgICAgIGNvbnN0IG5hbWUgPSB0b2tlbnNbMF07XFxuICAgICAgICAvLyBjb25zb2xlLmluZm8oXFwnUGFyc2luZyBuZXcgTWF0ZXJpYWw6XFwnLCBuYW1lKTtcXG4gICAgICAgIHRoaXMuY3VycmVudE1hdGVyaWFsID0gbmV3IE1hdGVyaWFsKG5hbWUpO1xcbiAgICAgICAgdGhpcy5tYXRlcmlhbHNbbmFtZV0gPSB0aGlzLmN1cnJlbnRNYXRlcmlhbDtcXG4gICAgfVxcbiAgICAvKipcXG4gICAgICogU2VlIHRoZSBkb2N1bWVuYXRpb24gZm9yIHBhcnNlX0thIGJlbG93IGZvciBhIGJldHRlciB1bmRlcnN0YW5kaW5nLlxcbiAgICAgKlxcbiAgICAgKiBHaXZlbiBhIGxpc3Qgb2YgcG9zc2libGUgY29sb3IgdG9rZW5zLCByZXR1cm5zIGFuIGFycmF5IG9mIFIsIEcsIGFuZCBCXFxuICAgICAqIGNvbG9yIHZhbHVlcy5cXG4gICAgICpcXG4gICAgICogQHBhcmFtIHRva2VucyB0aGUgdG9rZW5zIGFzc29jaWF0ZWQgd2l0aCB0aGUgZGlyZWN0aXZlXFxuICAgICAqIEByZXR1cm4geyp9IGEgMyBlbGVtZW50IGFycmF5IGNvbnRhaW5pbmcgdGhlIFIsIEcsIGFuZCBCIHZhbHVlc1xcbiAgICAgKiBvZiB0aGUgY29sb3IuXFxuICAgICAqL1xcbiAgICBwYXJzZUNvbG9yKHRva2Vucykge1xcbiAgICAgICAgaWYgKHRva2Vuc1swXSA9PSBcInNwZWN0cmFsXCIpIHtcXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUaGUgTVRMIHBhcnNlciBkb2VzIG5vdCBzdXBwb3J0IHNwZWN0cmFsIGN1cnZlIGZpbGVzLiBZb3Ugd2lsbCBcIiArXFxuICAgICAgICAgICAgICAgIFwibmVlZCB0byBjb252ZXJ0IHRoZSBNVEwgY29sb3JzIHRvIGVpdGhlciBSR0Igb3IgQ0lFWFlaLlwiKTtcXG4gICAgICAgIH1cXG4gICAgICAgIGlmICh0b2tlbnNbMF0gPT0gXCJ4eXpcIikge1xcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRoZSBNVEwgcGFyc2VyIGRvZXMgbm90IGN1cnJlbnRseSBzdXBwb3J0IFhZWiBjb2xvcnMuIEVpdGhlciBjb252ZXJ0IHRoZSBcIiArXFxuICAgICAgICAgICAgICAgIFwiWFlaIHZhbHVlcyB0byBSR0Igb3IgY3JlYXRlIGFuIGlzc3VlIHRvIGFkZCBzdXBwb3J0IGZvciBYWVpcIik7XFxuICAgICAgICB9XFxuICAgICAgICAvLyBmcm9tIG15IHVuZGVyc3RhbmRpbmcgb2YgdGhlIHNwZWMsIFJHQiB2YWx1ZXMgYXQgdGhpcyBwb2ludFxcbiAgICAgICAgLy8gd2lsbCBlaXRoZXIgYmUgMyBmbG9hdHMgb3IgZXhhY3RseSAxIGZsb2F0LCBzbyB0aGF0XFwncyB0aGUgY2hlY2tcXG4gICAgICAgIC8vIHRoYXQgaVxcJ20gZ29pbmcgdG8gcGVyZm9ybSBoZXJlXFxuICAgICAgICBpZiAodG9rZW5zLmxlbmd0aCA9PSAzKSB7XFxuICAgICAgICAgICAgY29uc3QgW3gsIHksIHpdID0gdG9rZW5zO1xcbiAgICAgICAgICAgIHJldHVybiBbcGFyc2VGbG9hdCh4KSwgcGFyc2VGbG9hdCh5KSwgcGFyc2VGbG9hdCh6KV07XFxuICAgICAgICB9XFxuICAgICAgICAvLyBTaW5jZSB0b2tlbnMgYXQgdGhpcyBwb2ludCBoYXMgYSBsZW5ndGggb2YgMywgd2VcXCdyZSBnb2luZyB0byBhc3N1bWVcXG4gICAgICAgIC8vIGl0XFwncyBleGFjdGx5IDEsIHNraXBwaW5nIHRoZSBjaGVjayBmb3IgMi5cXG4gICAgICAgIGNvbnN0IHZhbHVlID0gcGFyc2VGbG9hdCh0b2tlbnNbMF0pO1xcbiAgICAgICAgLy8gaW4gdGhpcyBjYXNlLCBhbGwgdmFsdWVzIGFyZSBlcXVpdmFsZW50XFxuICAgICAgICByZXR1cm4gW3ZhbHVlLCB2YWx1ZSwgdmFsdWVdO1xcbiAgICB9XFxuICAgIC8qKlxcbiAgICAgKiBQYXJzZSB0aGUgYW1iaWVudCByZWZsZWN0aXZpdHlcXG4gICAgICpcXG4gICAgICogQSBLYSBkaXJlY3RpdmUgY2FuIHRha2Ugb25lIG9mIHRocmVlIGZvcm1zOlxcbiAgICAgKiAgIC0gS2EgciBnIGJcXG4gICAgICogICAtIEthIHNwZWN0cmFsIGZpbGUucmZsXFxuICAgICAqICAgLSBLYSB4eXogeCB5IHpcXG4gICAgICogVGhlc2UgdGhyZWUgZm9ybXMgYXJlIG11dHVhbGx5IGV4Y2x1c2l2ZSBpbiB0aGF0IG9ubHkgb25lXFxuICAgICAqIGRlY2xhcmF0aW9uIGNhbiBleGlzdCBwZXIgbWF0ZXJpYWwuIEl0IGlzIGNvbnNpZGVyZWQgYSBzeW50YXhcXG4gICAgICogZXJyb3Igb3RoZXJ3aXNlLlxcbiAgICAgKlxcbiAgICAgKiBUaGUgXCJLYVwiIGZvcm0gc3BlY2lmaWVzIHRoZSBhbWJpZW50IHJlZmxlY3Rpdml0eSB1c2luZyBSR0IgdmFsdWVzLlxcbiAgICAgKiBUaGUgXCJnXCIgYW5kIFwiYlwiIHZhbHVlcyBhcmUgb3B0aW9uYWwuIElmIG9ubHkgdGhlIFwiclwiIHZhbHVlIGlzXFxuICAgICAqIHNwZWNpZmllZCwgdGhlbiB0aGUgXCJnXCIgYW5kIFwiYlwiIHZhbHVlcyBhcmUgYXNzaWduZWQgdGhlIHZhbHVlIG9mXFxuICAgICAqIFwiclwiLiBWYWx1ZXMgYXJlIG5vcm1hbGx5IGluIHRoZSByYW5nZSAwLjAgdG8gMS4wLiBWYWx1ZXMgb3V0c2lkZVxcbiAgICAgKiBvZiB0aGlzIHJhbmdlIGluY3JlYXNlIG9yIGRlY3JlYXNlIHRoZSByZWZsZWN0aXZpdHkgYWNjb3JkaW5nbHkuXFxuICAgICAqXFxuICAgICAqIFRoZSBcIkthIHNwZWN0cmFsXCIgZm9ybSBzcGVjaWZpZXMgdGhlIGFtYmllbnQgcmVmbGVjdGl2aXR5IHVzaW5nIGFcXG4gICAgICogc3BlY3RyYWwgY3VydmUuIFwiZmlsZS5yZmxcIiBpcyB0aGUgbmFtZSBvZiB0aGUgXCIucmZsXCIgZmlsZSBjb250YWluaW5nXFxuICAgICAqIHRoZSBjdXJ2ZSBkYXRhLiBcImZhY3RvclwiIGlzIGFuIG9wdGlvbmFsIGFyZ3VtZW50IHdoaWNoIGlzIGEgbXVsdGlwbGllclxcbiAgICAgKiBmb3IgdGhlIHZhbHVlcyBpbiB0aGUgLnJmbCBmaWxlIGFuZCBkZWZhdWx0cyB0byAxLjAgaWYgbm90IHNwZWNpZmllZC5cXG4gICAgICpcXG4gICAgICogVGhlIFwiS2EgeHl6XCIgZm9ybSBzcGVjaWZpZXMgdGhlIGFtYmllbnQgcmVmbGVjdGl2aXR5IHVzaW5nIENJRVhZWiB2YWx1ZXMuXFxuICAgICAqIFwieCB5IHpcIiBhcmUgdGhlIHZhbHVlcyBvZiB0aGUgQ0lFWFlaIGNvbG9yIHNwYWNlLiBUaGUgXCJ5XCIgYW5kIFwielwiIGFyZ3VtZW50c1xcbiAgICAgKiBhcmUgb3B0aW9uYWwgYW5kIHRha2Ugb24gdGhlIHZhbHVlIG9mIHRoZSBcInhcIiBjb21wb25lbnQgaWYgb25seSBcInhcIiBpc1xcbiAgICAgKiBzcGVjaWZpZWQuIFRoZSBcInggeSB6XCIgdmFsdWVzIGFyZSBub3JtYWxseSBpbiB0aGUgcmFuZ2Ugb2YgMC4wIHRvIDEuMCBhbmRcXG4gICAgICogaW5jcmVhc2Ugb3IgZGVjcmVhc2UgYW1iaWVudCByZWZsZWN0aXZpdHkgYWNjb3JkaW5nbHkgb3V0c2lkZSBvZiB0aGF0XFxuICAgICAqIHJhbmdlLlxcbiAgICAgKlxcbiAgICAgKiBAcGFyYW0gdG9rZW5zIHRoZSB0b2tlbnMgYXNzb2NpYXRlZCB3aXRoIHRoZSBkaXJlY3RpdmVcXG4gICAgICovXFxuICAgIHBhcnNlX0thKHRva2Vucykge1xcbiAgICAgICAgdGhpcy5jdXJyZW50TWF0ZXJpYWwuYW1iaWVudCA9IHRoaXMucGFyc2VDb2xvcih0b2tlbnMpO1xcbiAgICB9XFxuICAgIC8qKlxcbiAgICAgKiBEaWZmdXNlIFJlZmxlY3Rpdml0eVxcbiAgICAgKlxcbiAgICAgKiBTaW1pbGFyIHRvIHRoZSBLYSBkaXJlY3RpdmUuIFNpbXBseSByZXBsYWNlIFwiS2FcIiB3aXRoIFwiS2RcIiBhbmQgdGhlIHJ1bGVzXFxuICAgICAqIGFyZSB0aGUgc2FtZVxcbiAgICAgKlxcbiAgICAgKiBAcGFyYW0gdG9rZW5zIHRoZSB0b2tlbnMgYXNzb2NpYXRlZCB3aXRoIHRoZSBkaXJlY3RpdmVcXG4gICAgICovXFxuICAgIHBhcnNlX0tkKHRva2Vucykge1xcbiAgICAgICAgdGhpcy5jdXJyZW50TWF0ZXJpYWwuZGlmZnVzZSA9IHRoaXMucGFyc2VDb2xvcih0b2tlbnMpO1xcbiAgICB9XFxuICAgIC8qKlxcbiAgICAgKiBTcGVjdHJhbCBSZWZsZWN0aXZpdHlcXG4gICAgICpcXG4gICAgICogU2ltaWxhciB0byB0aGUgS2EgZGlyZWN0aXZlLiBTaW1wbHkgcmVwbGFjZSBcIktzXCIgd2l0aCBcIktkXCIgYW5kIHRoZSBydWxlc1xcbiAgICAgKiBhcmUgdGhlIHNhbWVcXG4gICAgICpcXG4gICAgICogQHBhcmFtIHRva2VucyB0aGUgdG9rZW5zIGFzc29jaWF0ZWQgd2l0aCB0aGUgZGlyZWN0aXZlXFxuICAgICAqL1xcbiAgICBwYXJzZV9Lcyh0b2tlbnMpIHtcXG4gICAgICAgIHRoaXMuY3VycmVudE1hdGVyaWFsLnNwZWN1bGFyID0gdGhpcy5wYXJzZUNvbG9yKHRva2Vucyk7XFxuICAgIH1cXG4gICAgLyoqXFxuICAgICAqIEVtaXNzaXZlXFxuICAgICAqXFxuICAgICAqIFRoZSBhbW91bnQgYW5kIGNvbG9yIG9mIGxpZ2h0IGVtaXR0ZWQgYnkgdGhlIG9iamVjdC5cXG4gICAgICpcXG4gICAgICogQHBhcmFtIHRva2VucyB0aGUgdG9rZW5zIGFzc29jaWF0ZWQgd2l0aCB0aGUgZGlyZWN0aXZlXFxuICAgICAqL1xcbiAgICBwYXJzZV9LZSh0b2tlbnMpIHtcXG4gICAgICAgIHRoaXMuY3VycmVudE1hdGVyaWFsLmVtaXNzaXZlID0gdGhpcy5wYXJzZUNvbG9yKHRva2Vucyk7XFxuICAgIH1cXG4gICAgLyoqXFxuICAgICAqIFRyYW5zbWlzc2lvbiBGaWx0ZXJcXG4gICAgICpcXG4gICAgICogQW55IGxpZ2h0IHBhc3NpbmcgdGhyb3VnaCB0aGUgb2JqZWN0IGlzIGZpbHRlcmVkIGJ5IHRoZSB0cmFuc21pc3Npb25cXG4gICAgICogZmlsdGVyLCB3aGljaCBvbmx5IGFsbG93cyBzcGVjaWZpYyBjb2xvcnMgdG8gcGFzcyB0aHJvdWdoLiBGb3IgZXhhbXBsZSwgVGZcXG4gICAgICogMCAxIDAgYWxsb3dzIGFsbCBvZiB0aGUgZ3JlZW4gdG8gcGFzcyB0aHJvdWdoIGFuZCBmaWx0ZXJzIG91dCBhbGwgb2YgdGhlXFxuICAgICAqIHJlZCBhbmQgYmx1ZS5cXG4gICAgICpcXG4gICAgICogU2ltaWxhciB0byB0aGUgS2EgZGlyZWN0aXZlLiBTaW1wbHkgcmVwbGFjZSBcIktzXCIgd2l0aCBcIlRmXCIgYW5kIHRoZSBydWxlc1xcbiAgICAgKiBhcmUgdGhlIHNhbWVcXG4gICAgICpcXG4gICAgICogQHBhcmFtIHRva2VucyB0aGUgdG9rZW5zIGFzc29jaWF0ZWQgd2l0aCB0aGUgZGlyZWN0aXZlXFxuICAgICAqL1xcbiAgICBwYXJzZV9UZih0b2tlbnMpIHtcXG4gICAgICAgIHRoaXMuY3VycmVudE1hdGVyaWFsLnRyYW5zbWlzc2lvbkZpbHRlciA9IHRoaXMucGFyc2VDb2xvcih0b2tlbnMpO1xcbiAgICB9XFxuICAgIC8qKlxcbiAgICAgKiBTcGVjaWZpZXMgdGhlIGRpc3NvbHZlIGZvciB0aGUgY3VycmVudCBtYXRlcmlhbC5cXG4gICAgICpcXG4gICAgICogU3RhdGVtZW50OiBkIFstaGFsb10gYGZhY3RvcmBcXG4gICAgICpcXG4gICAgICogRXhhbXBsZTogXCJkIDAuNVwiXFxuICAgICAqXFxuICAgICAqIFRoZSBmYWN0b3IgaXMgdGhlIGFtb3VudCB0aGlzIG1hdGVyaWFsIGRpc3NvbHZlcyBpbnRvIHRoZSBiYWNrZ3JvdW5kLiBBXFxuICAgICAqIGZhY3RvciBvZiAxLjAgaXMgZnVsbHkgb3BhcXVlLiBUaGlzIGlzIHRoZSBkZWZhdWx0IHdoZW4gYSBuZXcgbWF0ZXJpYWwgaXNcXG4gICAgICogY3JlYXRlZC4gQSBmYWN0b3Igb2YgMC4wIGlzIGZ1bGx5IGRpc3NvbHZlZCAoY29tcGxldGVseSB0cmFuc3BhcmVudCkuXFxuICAgICAqXFxuICAgICAqIFVubGlrZSBhIHJlYWwgdHJhbnNwYXJlbnQgbWF0ZXJpYWwsIHRoZSBkaXNzb2x2ZSBkb2VzIG5vdCBkZXBlbmQgdXBvblxcbiAgICAgKiBtYXRlcmlhbCB0aGlja25lc3Mgbm9yIGRvZXMgaXQgaGF2ZSBhbnkgc3BlY3RyYWwgY2hhcmFjdGVyLiBEaXNzb2x2ZSB3b3Jrc1xcbiAgICAgKiBvbiBhbGwgaWxsdW1pbmF0aW9uIG1vZGVscy5cXG4gICAgICpcXG4gICAgICogVGhlIGRpc3NvbHZlIHN0YXRlbWVudCBhbGxvd3MgZm9yIGFuIG9wdGlvbmFsIFwiLWhhbG9cIiBmbGFnIHdoaWNoIGluZGljYXRlc1xcbiAgICAgKiB0aGF0IGEgZGlzc29sdmUgaXMgZGVwZW5kZW50IG9uIHRoZSBzdXJmYWNlIG9yaWVudGF0aW9uIHJlbGF0aXZlIHRvIHRoZVxcbiAgICAgKiB2aWV3ZXIuIEZvciBleGFtcGxlLCBhIHNwaGVyZSB3aXRoIHRoZSBmb2xsb3dpbmcgZGlzc29sdmUsIFwiZCAtaGFsbyAwLjBcIixcXG4gICAgICogd2lsbCBiZSBmdWxseSBkaXNzb2x2ZWQgYXQgaXRzIGNlbnRlciBhbmQgd2lsbCBhcHBlYXIgZ3JhZHVhbGx5IG1vcmUgb3BhcXVlXFxuICAgICAqIHRvd2FyZCBpdHMgZWRnZS5cXG4gICAgICpcXG4gICAgICogXCJmYWN0b3JcIiBpcyB0aGUgbWluaW11bSBhbW91bnQgb2YgZGlzc29sdmUgYXBwbGllZCB0byB0aGUgbWF0ZXJpYWwuIFRoZVxcbiAgICAgKiBhbW91bnQgb2YgZGlzc29sdmUgd2lsbCB2YXJ5IGJldHdlZW4gMS4wIChmdWxseSBvcGFxdWUpIGFuZCB0aGUgc3BlY2lmaWVkXFxuICAgICAqIFwiZmFjdG9yXCIuIFRoZSBmb3JtdWxhIGlzOlxcbiAgICAgKlxcbiAgICAgKiAgICBkaXNzb2x2ZSA9IDEuMCAtIChOKnYpKDEuMC1mYWN0b3IpXFxuICAgICAqXFxuICAgICAqIEBwYXJhbSB0b2tlbnMgdGhlIHRva2VucyBhc3NvY2lhdGVkIHdpdGggdGhlIGRpcmVjdGl2ZVxcbiAgICAgKi9cXG4gICAgcGFyc2VfZCh0b2tlbnMpIHtcXG4gICAgICAgIC8vIHRoaXMgaWdub3JlcyB0aGUgLWhhbG8gb3B0aW9uIGFzIEkgY2FuXFwndCBmaW5kIGFueSBkb2N1bWVudGF0aW9uIG9uIHdoYXRcXG4gICAgICAgIC8vIGl0XFwncyBzdXBwb3NlZCB0byBiZS5cXG4gICAgICAgIHRoaXMuY3VycmVudE1hdGVyaWFsLmRpc3NvbHZlID0gcGFyc2VGbG9hdCh0b2tlbnMucG9wKCkgfHwgXCIwXCIpO1xcbiAgICB9XFxuICAgIC8qKlxcbiAgICAgKiBUaGUgXCJpbGx1bVwiIHN0YXRlbWVudCBzcGVjaWZpZXMgdGhlIGlsbHVtaW5hdGlvbiBtb2RlbCB0byB1c2UgaW4gdGhlXFxuICAgICAqIG1hdGVyaWFsLiBJbGx1bWluYXRpb24gbW9kZWxzIGFyZSBtYXRoZW1hdGljYWwgZXF1YXRpb25zIHRoYXQgcmVwcmVzZW50XFxuICAgICAqIHZhcmlvdXMgbWF0ZXJpYWwgbGlnaHRpbmcgYW5kIHNoYWRpbmcgZWZmZWN0cy5cXG4gICAgICpcXG4gICAgICogVGhlIGlsbHVtaW5hdGlvbiBudW1iZXIgY2FuIGJlIGEgbnVtYmVyIGZyb20gMCB0byAxMC4gVGhlIGZvbGxvd2luZyBhcmVcXG4gICAgICogdGhlIGxpc3Qgb2YgaWxsdW1pbmF0aW9uIGVudW1lcmF0aW9ucyBhbmQgdGhlaXIgc3VtbWFyaWVzOlxcbiAgICAgKiAwLiBDb2xvciBvbiBhbmQgQW1iaWVudCBvZmZcXG4gICAgICogMS4gQ29sb3Igb24gYW5kIEFtYmllbnQgb25cXG4gICAgICogMi4gSGlnaGxpZ2h0IG9uXFxuICAgICAqIDMuIFJlZmxlY3Rpb24gb24gYW5kIFJheSB0cmFjZSBvblxcbiAgICAgKiA0LiBUcmFuc3BhcmVuY3k6IEdsYXNzIG9uLCBSZWZsZWN0aW9uOiBSYXkgdHJhY2Ugb25cXG4gICAgICogNS4gUmVmbGVjdGlvbjogRnJlc25lbCBvbiBhbmQgUmF5IHRyYWNlIG9uXFxuICAgICAqIDYuIFRyYW5zcGFyZW5jeTogUmVmcmFjdGlvbiBvbiwgUmVmbGVjdGlvbjogRnJlc25lbCBvZmYgYW5kIFJheSB0cmFjZSBvblxcbiAgICAgKiA3LiBUcmFuc3BhcmVuY3k6IFJlZnJhY3Rpb24gb24sIFJlZmxlY3Rpb246IEZyZXNuZWwgb24gYW5kIFJheSB0cmFjZSBvblxcbiAgICAgKiA4LiBSZWZsZWN0aW9uIG9uIGFuZCBSYXkgdHJhY2Ugb2ZmXFxuICAgICAqIDkuIFRyYW5zcGFyZW5jeTogR2xhc3Mgb24sIFJlZmxlY3Rpb246IFJheSB0cmFjZSBvZmZcXG4gICAgICogMTAuIENhc3RzIHNoYWRvd3Mgb250byBpbnZpc2libGUgc3VyZmFjZXNcXG4gICAgICpcXG4gICAgICogRXhhbXBsZTogXCJpbGx1bSAyXCIgdG8gc3BlY2lmeSB0aGUgXCJIaWdobGlnaHQgb25cIiBtb2RlbFxcbiAgICAgKlxcbiAgICAgKiBAcGFyYW0gdG9rZW5zIHRoZSB0b2tlbnMgYXNzb2NpYXRlZCB3aXRoIHRoZSBkaXJlY3RpdmVcXG4gICAgICovXFxuICAgIHBhcnNlX2lsbHVtKHRva2Vucykge1xcbiAgICAgICAgdGhpcy5jdXJyZW50TWF0ZXJpYWwuaWxsdW1pbmF0aW9uID0gcGFyc2VJbnQodG9rZW5zWzBdKTtcXG4gICAgfVxcbiAgICAvKipcXG4gICAgICogT3B0aWNhbCBEZW5zaXR5IChBS0EgSW5kZXggb2YgUmVmcmFjdGlvbilcXG4gICAgICpcXG4gICAgICogU3RhdGVtZW50OiBOaSBgaW5kZXhgXFxuICAgICAqXFxuICAgICAqIEV4YW1wbGU6IE5pIDEuMFxcbiAgICAgKlxcbiAgICAgKiBTcGVjaWZpZXMgdGhlIG9wdGljYWwgZGVuc2l0eSBmb3IgdGhlIHN1cmZhY2UuIGBpbmRleGAgaXMgdGhlIHZhbHVlXFxuICAgICAqIGZvciB0aGUgb3B0aWNhbCBkZW5zaXR5LiBUaGUgdmFsdWVzIGNhbiByYW5nZSBmcm9tIDAuMDAxIHRvIDEwLiAgQSB2YWx1ZSBvZlxcbiAgICAgKiAxLjAgbWVhbnMgdGhhdCBsaWdodCBkb2VzIG5vdCBiZW5kIGFzIGl0IHBhc3NlcyB0aHJvdWdoIGFuIG9iamVjdC5cXG4gICAgICogSW5jcmVhc2luZyB0aGUgb3B0aWNhbF9kZW5zaXR5IGluY3JlYXNlcyB0aGUgYW1vdW50IG9mIGJlbmRpbmcuIEdsYXNzIGhhc1xcbiAgICAgKiBhbiBpbmRleCBvZiByZWZyYWN0aW9uIG9mIGFib3V0IDEuNS4gVmFsdWVzIG9mIGxlc3MgdGhhbiAxLjAgcHJvZHVjZVxcbiAgICAgKiBiaXphcnJlIHJlc3VsdHMgYW5kIGFyZSBub3QgcmVjb21tZW5kZWRcXG4gICAgICpcXG4gICAgICogQHBhcmFtIHRva2VucyB0aGUgdG9rZW5zIGFzc29jaWF0ZWQgd2l0aCB0aGUgZGlyZWN0aXZlXFxuICAgICAqL1xcbiAgICBwYXJzZV9OaSh0b2tlbnMpIHtcXG4gICAgICAgIHRoaXMuY3VycmVudE1hdGVyaWFsLnJlZnJhY3Rpb25JbmRleCA9IHBhcnNlRmxvYXQodG9rZW5zWzBdKTtcXG4gICAgfVxcbiAgICAvKipcXG4gICAgICogU3BlY2lmaWVzIHRoZSBzcGVjdWxhciBleHBvbmVudCBmb3IgdGhlIGN1cnJlbnQgbWF0ZXJpYWwuIFRoaXMgZGVmaW5lcyB0aGVcXG4gICAgICogZm9jdXMgb2YgdGhlIHNwZWN1bGFyIGhpZ2hsaWdodC5cXG4gICAgICpcXG4gICAgICogU3RhdGVtZW50OiBOcyBgZXhwb25lbnRgXFxuICAgICAqXFxuICAgICAqIEV4YW1wbGU6IFwiTnMgMjUwXCJcXG4gICAgICpcXG4gICAgICogYGV4cG9uZW50YCBpcyB0aGUgdmFsdWUgZm9yIHRoZSBzcGVjdWxhciBleHBvbmVudC4gQSBoaWdoIGV4cG9uZW50IHJlc3VsdHNcXG4gICAgICogaW4gYSB0aWdodCwgY29uY2VudHJhdGVkIGhpZ2hsaWdodC4gTnMgVmFsdWVzIG5vcm1hbGx5IHJhbmdlIGZyb20gMCB0b1xcbiAgICAgKiAxMDAwLlxcbiAgICAgKlxcbiAgICAgKiBAcGFyYW0gdG9rZW5zIHRoZSB0b2tlbnMgYXNzb2NpYXRlZCB3aXRoIHRoZSBkaXJlY3RpdmVcXG4gICAgICovXFxuICAgIHBhcnNlX05zKHRva2Vucykge1xcbiAgICAgICAgdGhpcy5jdXJyZW50TWF0ZXJpYWwuc3BlY3VsYXJFeHBvbmVudCA9IHBhcnNlSW50KHRva2Vuc1swXSk7XFxuICAgIH1cXG4gICAgLyoqXFxuICAgICAqIFNwZWNpZmllcyB0aGUgc2hhcnBuZXNzIG9mIHRoZSByZWZsZWN0aW9ucyBmcm9tIHRoZSBsb2NhbCByZWZsZWN0aW9uIG1hcC5cXG4gICAgICpcXG4gICAgICogU3RhdGVtZW50OiBzaGFycG5lc3MgYHZhbHVlYFxcbiAgICAgKlxcbiAgICAgKiBFeGFtcGxlOiBcInNoYXJwbmVzcyAxMDBcIlxcbiAgICAgKlxcbiAgICAgKiBJZiBhIG1hdGVyaWFsIGRvZXMgbm90IGhhdmUgYSBsb2NhbCByZWZsZWN0aW9uIG1hcCBkZWZpbmVkIGluIGl0cyBtYXRlcmlhbFxcbiAgICAgKiBkZWZpbnRpb25zLCBzaGFycG5lc3Mgd2lsbCBhcHBseSB0byB0aGUgZ2xvYmFsIHJlZmxlY3Rpb24gbWFwIGRlZmluZWQgaW5cXG4gICAgICogUHJlVmlldy5cXG4gICAgICpcXG4gICAgICogYHZhbHVlYCBjYW4gYmUgYSBudW1iZXIgZnJvbSAwIHRvIDEwMDAuIFRoZSBkZWZhdWx0IGlzIDYwLiBBIGhpZ2ggdmFsdWVcXG4gICAgICogcmVzdWx0cyBpbiBhIGNsZWFyIHJlZmxlY3Rpb24gb2Ygb2JqZWN0cyBpbiB0aGUgcmVmbGVjdGlvbiBtYXAuXFxuICAgICAqXFxuICAgICAqIFRpcDogc2hhcnBuZXNzIHZhbHVlcyBncmVhdGVyIHRoYW4gMTAwIGludHJvZHVjZSBhbGlhc2luZyBlZmZlY3RzIGluXFxuICAgICAqIGZsYXQgc3VyZmFjZXMgdGhhdCBhcmUgdmlld2VkIGF0IGEgc2hhcnAgYW5nbGUuXFxuICAgICAqXFxuICAgICAqIEBwYXJhbSB0b2tlbnMgdGhlIHRva2VucyBhc3NvY2lhdGVkIHdpdGggdGhlIGRpcmVjdGl2ZVxcbiAgICAgKi9cXG4gICAgcGFyc2Vfc2hhcnBuZXNzKHRva2Vucykge1xcbiAgICAgICAgdGhpcy5jdXJyZW50TWF0ZXJpYWwuc2hhcnBuZXNzID0gcGFyc2VJbnQodG9rZW5zWzBdKTtcXG4gICAgfVxcbiAgICAvKipcXG4gICAgICogUGFyc2VzIHRoZSAtY2MgZmxhZyBhbmQgdXBkYXRlcyB0aGUgb3B0aW9ucyBvYmplY3Qgd2l0aCB0aGUgdmFsdWVzLlxcbiAgICAgKlxcbiAgICAgKiBAcGFyYW0gdmFsdWVzIHRoZSB2YWx1ZXMgcGFzc2VkIHRvIHRoZSAtY2MgZmxhZ1xcbiAgICAgKiBAcGFyYW0gb3B0aW9ucyB0aGUgT2JqZWN0IG9mIGFsbCBpbWFnZSBvcHRpb25zXFxuICAgICAqL1xcbiAgICBwYXJzZV9jYyh2YWx1ZXMsIG9wdGlvbnMpIHtcXG4gICAgICAgIG9wdGlvbnMuY29sb3JDb3JyZWN0aW9uID0gdmFsdWVzWzBdID09IFwib25cIjtcXG4gICAgfVxcbiAgICAvKipcXG4gICAgICogUGFyc2VzIHRoZSAtYmxlbmR1IGZsYWcgYW5kIHVwZGF0ZXMgdGhlIG9wdGlvbnMgb2JqZWN0IHdpdGggdGhlIHZhbHVlcy5cXG4gICAgICpcXG4gICAgICogQHBhcmFtIHZhbHVlcyB0aGUgdmFsdWVzIHBhc3NlZCB0byB0aGUgLWJsZW5kdSBmbGFnXFxuICAgICAqIEBwYXJhbSBvcHRpb25zIHRoZSBPYmplY3Qgb2YgYWxsIGltYWdlIG9wdGlvbnNcXG4gICAgICovXFxuICAgIHBhcnNlX2JsZW5kdSh2YWx1ZXMsIG9wdGlvbnMpIHtcXG4gICAgICAgIG9wdGlvbnMuaG9yaXpvbnRhbEJsZW5kaW5nID0gdmFsdWVzWzBdID09IFwib25cIjtcXG4gICAgfVxcbiAgICAvKipcXG4gICAgICogUGFyc2VzIHRoZSAtYmxlbmR2IGZsYWcgYW5kIHVwZGF0ZXMgdGhlIG9wdGlvbnMgb2JqZWN0IHdpdGggdGhlIHZhbHVlcy5cXG4gICAgICpcXG4gICAgICogQHBhcmFtIHZhbHVlcyB0aGUgdmFsdWVzIHBhc3NlZCB0byB0aGUgLWJsZW5kdiBmbGFnXFxuICAgICAqIEBwYXJhbSBvcHRpb25zIHRoZSBPYmplY3Qgb2YgYWxsIGltYWdlIG9wdGlvbnNcXG4gICAgICovXFxuICAgIHBhcnNlX2JsZW5kdih2YWx1ZXMsIG9wdGlvbnMpIHtcXG4gICAgICAgIG9wdGlvbnMudmVydGljYWxCbGVuZGluZyA9IHZhbHVlc1swXSA9PSBcIm9uXCI7XFxuICAgIH1cXG4gICAgLyoqXFxuICAgICAqIFBhcnNlcyB0aGUgLWJvb3N0IGZsYWcgYW5kIHVwZGF0ZXMgdGhlIG9wdGlvbnMgb2JqZWN0IHdpdGggdGhlIHZhbHVlcy5cXG4gICAgICpcXG4gICAgICogQHBhcmFtIHZhbHVlcyB0aGUgdmFsdWVzIHBhc3NlZCB0byB0aGUgLWJvb3N0IGZsYWdcXG4gICAgICogQHBhcmFtIG9wdGlvbnMgdGhlIE9iamVjdCBvZiBhbGwgaW1hZ2Ugb3B0aW9uc1xcbiAgICAgKi9cXG4gICAgcGFyc2VfYm9vc3QodmFsdWVzLCBvcHRpb25zKSB7XFxuICAgICAgICBvcHRpb25zLmJvb3N0TWlwTWFwU2hhcnBuZXNzID0gcGFyc2VGbG9hdCh2YWx1ZXNbMF0pO1xcbiAgICB9XFxuICAgIC8qKlxcbiAgICAgKiBQYXJzZXMgdGhlIC1tbSBmbGFnIGFuZCB1cGRhdGVzIHRoZSBvcHRpb25zIG9iamVjdCB3aXRoIHRoZSB2YWx1ZXMuXFxuICAgICAqXFxuICAgICAqIEBwYXJhbSB2YWx1ZXMgdGhlIHZhbHVlcyBwYXNzZWQgdG8gdGhlIC1tbSBmbGFnXFxuICAgICAqIEBwYXJhbSBvcHRpb25zIHRoZSBPYmplY3Qgb2YgYWxsIGltYWdlIG9wdGlvbnNcXG4gICAgICovXFxuICAgIHBhcnNlX21tKHZhbHVlcywgb3B0aW9ucykge1xcbiAgICAgICAgb3B0aW9ucy5tb2RpZnlUZXh0dXJlTWFwLmJyaWdodG5lc3MgPSBwYXJzZUZsb2F0KHZhbHVlc1swXSk7XFxuICAgICAgICBvcHRpb25zLm1vZGlmeVRleHR1cmVNYXAuY29udHJhc3QgPSBwYXJzZUZsb2F0KHZhbHVlc1sxXSk7XFxuICAgIH1cXG4gICAgLyoqXFxuICAgICAqIFBhcnNlcyBhbmQgc2V0cyB0aGUgLW8sIC1zLCBhbmQgLXQgIHUsIHYsIGFuZCB3IHZhbHVlc1xcbiAgICAgKlxcbiAgICAgKiBAcGFyYW0gdmFsdWVzIHRoZSB2YWx1ZXMgcGFzc2VkIHRvIHRoZSAtbywgLXMsIC10IGZsYWdcXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbiB0aGUgT2JqZWN0IG9mIGVpdGhlciB0aGUgLW8sIC1zLCAtdCBvcHRpb25cXG4gICAgICogQHBhcmFtIHtJbnRlZ2VyfSBkZWZhdWx0VmFsdWUgdGhlIE9iamVjdCBvZiBhbGwgaW1hZ2Ugb3B0aW9uc1xcbiAgICAgKi9cXG4gICAgcGFyc2Vfb3N0KHZhbHVlcywgb3B0aW9uLCBkZWZhdWx0VmFsdWUpIHtcXG4gICAgICAgIHdoaWxlICh2YWx1ZXMubGVuZ3RoIDwgMykge1xcbiAgICAgICAgICAgIHZhbHVlcy5wdXNoKGRlZmF1bHRWYWx1ZS50b1N0cmluZygpKTtcXG4gICAgICAgIH1cXG4gICAgICAgIG9wdGlvbi51ID0gcGFyc2VGbG9hdCh2YWx1ZXNbMF0pO1xcbiAgICAgICAgb3B0aW9uLnYgPSBwYXJzZUZsb2F0KHZhbHVlc1sxXSk7XFxuICAgICAgICBvcHRpb24udyA9IHBhcnNlRmxvYXQodmFsdWVzWzJdKTtcXG4gICAgfVxcbiAgICAvKipcXG4gICAgICogUGFyc2VzIHRoZSAtbyBmbGFnIGFuZCB1cGRhdGVzIHRoZSBvcHRpb25zIG9iamVjdCB3aXRoIHRoZSB2YWx1ZXMuXFxuICAgICAqXFxuICAgICAqIEBwYXJhbSB2YWx1ZXMgdGhlIHZhbHVlcyBwYXNzZWQgdG8gdGhlIC1vIGZsYWdcXG4gICAgICogQHBhcmFtIG9wdGlvbnMgdGhlIE9iamVjdCBvZiBhbGwgaW1hZ2Ugb3B0aW9uc1xcbiAgICAgKi9cXG4gICAgcGFyc2Vfbyh2YWx1ZXMsIG9wdGlvbnMpIHtcXG4gICAgICAgIHRoaXMucGFyc2Vfb3N0KHZhbHVlcywgb3B0aW9ucy5vZmZzZXQsIDApO1xcbiAgICB9XFxuICAgIC8qKlxcbiAgICAgKiBQYXJzZXMgdGhlIC1zIGZsYWcgYW5kIHVwZGF0ZXMgdGhlIG9wdGlvbnMgb2JqZWN0IHdpdGggdGhlIHZhbHVlcy5cXG4gICAgICpcXG4gICAgICogQHBhcmFtIHZhbHVlcyB0aGUgdmFsdWVzIHBhc3NlZCB0byB0aGUgLXMgZmxhZ1xcbiAgICAgKiBAcGFyYW0gb3B0aW9ucyB0aGUgT2JqZWN0IG9mIGFsbCBpbWFnZSBvcHRpb25zXFxuICAgICAqL1xcbiAgICBwYXJzZV9zKHZhbHVlcywgb3B0aW9ucykge1xcbiAgICAgICAgdGhpcy5wYXJzZV9vc3QodmFsdWVzLCBvcHRpb25zLnNjYWxlLCAxKTtcXG4gICAgfVxcbiAgICAvKipcXG4gICAgICogUGFyc2VzIHRoZSAtdCBmbGFnIGFuZCB1cGRhdGVzIHRoZSBvcHRpb25zIG9iamVjdCB3aXRoIHRoZSB2YWx1ZXMuXFxuICAgICAqXFxuICAgICAqIEBwYXJhbSB2YWx1ZXMgdGhlIHZhbHVlcyBwYXNzZWQgdG8gdGhlIC10IGZsYWdcXG4gICAgICogQHBhcmFtIG9wdGlvbnMgdGhlIE9iamVjdCBvZiBhbGwgaW1hZ2Ugb3B0aW9uc1xcbiAgICAgKi9cXG4gICAgcGFyc2VfdCh2YWx1ZXMsIG9wdGlvbnMpIHtcXG4gICAgICAgIHRoaXMucGFyc2Vfb3N0KHZhbHVlcywgb3B0aW9ucy50dXJidWxlbmNlLCAwKTtcXG4gICAgfVxcbiAgICAvKipcXG4gICAgICogUGFyc2VzIHRoZSAtdGV4cmVzIGZsYWcgYW5kIHVwZGF0ZXMgdGhlIG9wdGlvbnMgb2JqZWN0IHdpdGggdGhlIHZhbHVlcy5cXG4gICAgICpcXG4gICAgICogQHBhcmFtIHZhbHVlcyB0aGUgdmFsdWVzIHBhc3NlZCB0byB0aGUgLXRleHJlcyBmbGFnXFxuICAgICAqIEBwYXJhbSBvcHRpb25zIHRoZSBPYmplY3Qgb2YgYWxsIGltYWdlIG9wdGlvbnNcXG4gICAgICovXFxuICAgIHBhcnNlX3RleHJlcyh2YWx1ZXMsIG9wdGlvbnMpIHtcXG4gICAgICAgIG9wdGlvbnMudGV4dHVyZVJlc29sdXRpb24gPSBwYXJzZUZsb2F0KHZhbHVlc1swXSk7XFxuICAgIH1cXG4gICAgLyoqXFxuICAgICAqIFBhcnNlcyB0aGUgLWNsYW1wIGZsYWcgYW5kIHVwZGF0ZXMgdGhlIG9wdGlvbnMgb2JqZWN0IHdpdGggdGhlIHZhbHVlcy5cXG4gICAgICpcXG4gICAgICogQHBhcmFtIHZhbHVlcyB0aGUgdmFsdWVzIHBhc3NlZCB0byB0aGUgLWNsYW1wIGZsYWdcXG4gICAgICogQHBhcmFtIG9wdGlvbnMgdGhlIE9iamVjdCBvZiBhbGwgaW1hZ2Ugb3B0aW9uc1xcbiAgICAgKi9cXG4gICAgcGFyc2VfY2xhbXAodmFsdWVzLCBvcHRpb25zKSB7XFxuICAgICAgICBvcHRpb25zLmNsYW1wID0gdmFsdWVzWzBdID09IFwib25cIjtcXG4gICAgfVxcbiAgICAvKipcXG4gICAgICogUGFyc2VzIHRoZSAtYm0gZmxhZyBhbmQgdXBkYXRlcyB0aGUgb3B0aW9ucyBvYmplY3Qgd2l0aCB0aGUgdmFsdWVzLlxcbiAgICAgKlxcbiAgICAgKiBAcGFyYW0gdmFsdWVzIHRoZSB2YWx1ZXMgcGFzc2VkIHRvIHRoZSAtYm0gZmxhZ1xcbiAgICAgKiBAcGFyYW0gb3B0aW9ucyB0aGUgT2JqZWN0IG9mIGFsbCBpbWFnZSBvcHRpb25zXFxuICAgICAqL1xcbiAgICBwYXJzZV9ibSh2YWx1ZXMsIG9wdGlvbnMpIHtcXG4gICAgICAgIG9wdGlvbnMuYnVtcE11bHRpcGxpZXIgPSBwYXJzZUZsb2F0KHZhbHVlc1swXSk7XFxuICAgIH1cXG4gICAgLyoqXFxuICAgICAqIFBhcnNlcyB0aGUgLWltZmNoYW4gZmxhZyBhbmQgdXBkYXRlcyB0aGUgb3B0aW9ucyBvYmplY3Qgd2l0aCB0aGUgdmFsdWVzLlxcbiAgICAgKlxcbiAgICAgKiBAcGFyYW0gdmFsdWVzIHRoZSB2YWx1ZXMgcGFzc2VkIHRvIHRoZSAtaW1mY2hhbiBmbGFnXFxuICAgICAqIEBwYXJhbSBvcHRpb25zIHRoZSBPYmplY3Qgb2YgYWxsIGltYWdlIG9wdGlvbnNcXG4gICAgICovXFxuICAgIHBhcnNlX2ltZmNoYW4odmFsdWVzLCBvcHRpb25zKSB7XFxuICAgICAgICBvcHRpb25zLmltZkNoYW4gPSB2YWx1ZXNbMF07XFxuICAgIH1cXG4gICAgLyoqXFxuICAgICAqIFRoaXMgb25seSBleGlzdHMgZm9yIHJlbGVjdGlvbiBtYXBzIGFuZCBkZW5vdGVzIHRoZSB0eXBlIG9mIHJlZmxlY3Rpb24uXFxuICAgICAqXFxuICAgICAqIEBwYXJhbSB2YWx1ZXMgdGhlIHZhbHVlcyBwYXNzZWQgdG8gdGhlIC10eXBlIGZsYWdcXG4gICAgICogQHBhcmFtIG9wdGlvbnMgdGhlIE9iamVjdCBvZiBhbGwgaW1hZ2Ugb3B0aW9uc1xcbiAgICAgKi9cXG4gICAgcGFyc2VfdHlwZSh2YWx1ZXMsIG9wdGlvbnMpIHtcXG4gICAgICAgIG9wdGlvbnMucmVmbGVjdGlvblR5cGUgPSB2YWx1ZXNbMF07XFxuICAgIH1cXG4gICAgLyoqXFxuICAgICAqIFBhcnNlcyB0aGUgdGV4dHVyZVxcJ3Mgb3B0aW9ucyBhbmQgcmV0dXJucyBhbiBvcHRpb25zIG9iamVjdCB3aXRoIHRoZSBpbmZvXFxuICAgICAqXFxuICAgICAqIEBwYXJhbSB0b2tlbnMgYWxsIG9mIHRoZSBvcHRpb24gdG9rZW5zIHRvIHBhc3MgdG8gdGhlIHRleHR1cmVcXG4gICAgICogQHJldHVybiB7T2JqZWN0fSBhIGNvbXBsZXRlIG9iamVjdCBvZiBvYmplY3RzIHRvIGFwcGx5IHRvIHRoZSB0ZXh0dXJlXFxuICAgICAqL1xcbiAgICBwYXJzZU9wdGlvbnModG9rZW5zKSB7XFxuICAgICAgICBjb25zdCBvcHRpb25zID0gZW1wdHlUZXh0dXJlT3B0aW9ucygpO1xcbiAgICAgICAgbGV0IG9wdGlvbjtcXG4gICAgICAgIGxldCB2YWx1ZXM7XFxuICAgICAgICBjb25zdCBvcHRpb25zVG9WYWx1ZXMgPSB7fTtcXG4gICAgICAgIHRva2Vucy5yZXZlcnNlKCk7XFxuICAgICAgICB3aGlsZSAodG9rZW5zLmxlbmd0aCkge1xcbiAgICAgICAgICAgIC8vIHRva2VuIGlzIGd1YXJhbnRlZWQgdG8gZXhpc3RzIGhlcmUsIGhlbmNlIHRoZSBleHBsaWNpdCBcImFzXCJcXG4gICAgICAgICAgICBjb25zdCB0b2tlbiA9IHRva2Vucy5wb3AoKTtcXG4gICAgICAgICAgICBpZiAodG9rZW4uc3RhcnRzV2l0aChcIi1cIikpIHtcXG4gICAgICAgICAgICAgICAgb3B0aW9uID0gdG9rZW4uc3Vic3RyKDEpO1xcbiAgICAgICAgICAgICAgICBvcHRpb25zVG9WYWx1ZXNbb3B0aW9uXSA9IFtdO1xcbiAgICAgICAgICAgIH1cXG4gICAgICAgICAgICBlbHNlIGlmIChvcHRpb24pIHtcXG4gICAgICAgICAgICAgICAgb3B0aW9uc1RvVmFsdWVzW29wdGlvbl0ucHVzaCh0b2tlbik7XFxuICAgICAgICAgICAgfVxcbiAgICAgICAgfVxcbiAgICAgICAgZm9yIChvcHRpb24gaW4gb3B0aW9uc1RvVmFsdWVzKSB7XFxuICAgICAgICAgICAgaWYgKCFvcHRpb25zVG9WYWx1ZXMuaGFzT3duUHJvcGVydHkob3B0aW9uKSkge1xcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcXG4gICAgICAgICAgICB9XFxuICAgICAgICAgICAgdmFsdWVzID0gb3B0aW9uc1RvVmFsdWVzW29wdGlvbl07XFxuICAgICAgICAgICAgY29uc3Qgb3B0aW9uTWV0aG9kID0gdGhpc1tgcGFyc2VfJHtvcHRpb259YF07XFxuICAgICAgICAgICAgaWYgKG9wdGlvbk1ldGhvZCkge1xcbiAgICAgICAgICAgICAgICBvcHRpb25NZXRob2QuYmluZCh0aGlzKSh2YWx1ZXMsIG9wdGlvbnMpO1xcbiAgICAgICAgICAgIH1cXG4gICAgICAgIH1cXG4gICAgICAgIHJldHVybiBvcHRpb25zO1xcbiAgICB9XFxuICAgIC8qKlxcbiAgICAgKiBQYXJzZXMgdGhlIGdpdmVuIHRleHR1cmUgbWFwIGxpbmUuXFxuICAgICAqXFxuICAgICAqIEBwYXJhbSB0b2tlbnMgYWxsIG9mIHRoZSB0b2tlbnMgcmVwcmVzZW50aW5nIHRoZSB0ZXh0dXJlXFxuICAgICAqIEByZXR1cm4gYSBjb21wbGV0ZSBvYmplY3Qgb2Ygb2JqZWN0cyB0byBhcHBseSB0byB0aGUgdGV4dHVyZVxcbiAgICAgKi9cXG4gICAgcGFyc2VNYXAodG9rZW5zKSB7XFxuICAgICAgICAvLyBhY2NvcmRpbmcgdG8gd2lraXBlZGlhOlxcbiAgICAgICAgLy8gKGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1dhdmVmcm9udF8ub2JqX2ZpbGUjVmVuZG9yX3NwZWNpZmljX2FsdGVyYXRpb25zKVxcbiAgICAgICAgLy8gdGhlcmUgaXMgYXQgbGVhc3Qgb25lIHZlbmRvciB0aGF0IHBsYWNlcyB0aGUgZmlsZW5hbWUgYmVmb3JlIHRoZSBvcHRpb25zXFxuICAgICAgICAvLyByYXRoZXIgdGhhbiBhZnRlciAod2hpY2ggaXMgdG8gc3BlYykuIEFsbCBvcHRpb25zIHN0YXJ0IHdpdGggYSBcXCctXFwnXFxuICAgICAgICAvLyBzbyBpZiB0aGUgZmlyc3QgdG9rZW4gZG9lc25cXCd0IHN0YXJ0IHdpdGggYSBcXCctXFwnLCB3ZVxcJ3JlIGdvaW5nIHRvIGFzc3VtZVxcbiAgICAgICAgLy8gaXRcXCdzIHRoZSBuYW1lIG9mIHRoZSBtYXAgZmlsZS5cXG4gICAgICAgIGxldCBvcHRpb25zU3RyaW5nO1xcbiAgICAgICAgbGV0IGZpbGVuYW1lID0gXCJcIjtcXG4gICAgICAgIGlmICghdG9rZW5zWzBdLnN0YXJ0c1dpdGgoXCItXCIpKSB7XFxuICAgICAgICAgICAgW2ZpbGVuYW1lLCAuLi5vcHRpb25zU3RyaW5nXSA9IHRva2VucztcXG4gICAgICAgIH1cXG4gICAgICAgIGVsc2Uge1xcbiAgICAgICAgICAgIGZpbGVuYW1lID0gdG9rZW5zLnBvcCgpO1xcbiAgICAgICAgICAgIG9wdGlvbnNTdHJpbmcgPSB0b2tlbnM7XFxuICAgICAgICB9XFxuICAgICAgICBjb25zdCBvcHRpb25zID0gdGhpcy5wYXJzZU9wdGlvbnMob3B0aW9uc1N0cmluZyk7XFxuICAgICAgICBvcHRpb25zLmZpbGVuYW1lID0gZmlsZW5hbWUucmVwbGFjZSgvXFxcXFxcXFwvZywgXCIvXCIpO1xcbiAgICAgICAgcmV0dXJuIG9wdGlvbnM7XFxuICAgIH1cXG4gICAgLyoqXFxuICAgICAqIFBhcnNlcyB0aGUgYW1iaWVudCBtYXAuXFxuICAgICAqXFxuICAgICAqIEBwYXJhbSB0b2tlbnMgbGlzdCBvZiB0b2tlbnMgZm9yIHRoZSBtYXBfS2EgZGlyZWNpdmVcXG4gICAgICovXFxuICAgIHBhcnNlX21hcF9LYSh0b2tlbnMpIHtcXG4gICAgICAgIHRoaXMuY3VycmVudE1hdGVyaWFsLm1hcEFtYmllbnQgPSB0aGlzLnBhcnNlTWFwKHRva2Vucyk7XFxuICAgIH1cXG4gICAgLyoqXFxuICAgICAqIFBhcnNlcyB0aGUgZGlmZnVzZSBtYXAuXFxuICAgICAqXFxuICAgICAqIEBwYXJhbSB0b2tlbnMgbGlzdCBvZiB0b2tlbnMgZm9yIHRoZSBtYXBfS2QgZGlyZWNpdmVcXG4gICAgICovXFxuICAgIHBhcnNlX21hcF9LZCh0b2tlbnMpIHtcXG4gICAgICAgIHRoaXMuY3VycmVudE1hdGVyaWFsLm1hcERpZmZ1c2UgPSB0aGlzLnBhcnNlTWFwKHRva2Vucyk7XFxuICAgIH1cXG4gICAgLyoqXFxuICAgICAqIFBhcnNlcyB0aGUgc3BlY3VsYXIgbWFwLlxcbiAgICAgKlxcbiAgICAgKiBAcGFyYW0gdG9rZW5zIGxpc3Qgb2YgdG9rZW5zIGZvciB0aGUgbWFwX0tzIGRpcmVjaXZlXFxuICAgICAqL1xcbiAgICBwYXJzZV9tYXBfS3ModG9rZW5zKSB7XFxuICAgICAgICB0aGlzLmN1cnJlbnRNYXRlcmlhbC5tYXBTcGVjdWxhciA9IHRoaXMucGFyc2VNYXAodG9rZW5zKTtcXG4gICAgfVxcbiAgICAvKipcXG4gICAgICogUGFyc2VzIHRoZSBlbWlzc2l2ZSBtYXAuXFxuICAgICAqXFxuICAgICAqIEBwYXJhbSB0b2tlbnMgbGlzdCBvZiB0b2tlbnMgZm9yIHRoZSBtYXBfS2UgZGlyZWNpdmVcXG4gICAgICovXFxuICAgIHBhcnNlX21hcF9LZSh0b2tlbnMpIHtcXG4gICAgICAgIHRoaXMuY3VycmVudE1hdGVyaWFsLm1hcEVtaXNzaXZlID0gdGhpcy5wYXJzZU1hcCh0b2tlbnMpO1xcbiAgICB9XFxuICAgIC8qKlxcbiAgICAgKiBQYXJzZXMgdGhlIHNwZWN1bGFyIGV4cG9uZW50IG1hcC5cXG4gICAgICpcXG4gICAgICogQHBhcmFtIHRva2VucyBsaXN0IG9mIHRva2VucyBmb3IgdGhlIG1hcF9OcyBkaXJlY2l2ZVxcbiAgICAgKi9cXG4gICAgcGFyc2VfbWFwX05zKHRva2Vucykge1xcbiAgICAgICAgdGhpcy5jdXJyZW50TWF0ZXJpYWwubWFwU3BlY3VsYXJFeHBvbmVudCA9IHRoaXMucGFyc2VNYXAodG9rZW5zKTtcXG4gICAgfVxcbiAgICAvKipcXG4gICAgICogUGFyc2VzIHRoZSBkaXNzb2x2ZSBtYXAuXFxuICAgICAqXFxuICAgICAqIEBwYXJhbSB0b2tlbnMgbGlzdCBvZiB0b2tlbnMgZm9yIHRoZSBtYXBfZCBkaXJlY2l2ZVxcbiAgICAgKi9cXG4gICAgcGFyc2VfbWFwX2QodG9rZW5zKSB7XFxuICAgICAgICB0aGlzLmN1cnJlbnRNYXRlcmlhbC5tYXBEaXNzb2x2ZSA9IHRoaXMucGFyc2VNYXAodG9rZW5zKTtcXG4gICAgfVxcbiAgICAvKipcXG4gICAgICogUGFyc2VzIHRoZSBhbnRpLWFsaWFzaW5nIG9wdGlvbi5cXG4gICAgICpcXG4gICAgICogQHBhcmFtIHRva2VucyBsaXN0IG9mIHRva2VucyBmb3IgdGhlIG1hcF9hYXQgZGlyZWNpdmVcXG4gICAgICovXFxuICAgIHBhcnNlX21hcF9hYXQodG9rZW5zKSB7XFxuICAgICAgICB0aGlzLmN1cnJlbnRNYXRlcmlhbC5hbnRpQWxpYXNpbmcgPSB0b2tlbnNbMF0gPT0gXCJvblwiO1xcbiAgICB9XFxuICAgIC8qKlxcbiAgICAgKiBQYXJzZXMgdGhlIGJ1bXAgbWFwLlxcbiAgICAgKlxcbiAgICAgKiBAcGFyYW0gdG9rZW5zIGxpc3Qgb2YgdG9rZW5zIGZvciB0aGUgbWFwX2J1bXAgZGlyZWNpdmVcXG4gICAgICovXFxuICAgIHBhcnNlX21hcF9idW1wKHRva2Vucykge1xcbiAgICAgICAgdGhpcy5jdXJyZW50TWF0ZXJpYWwubWFwQnVtcCA9IHRoaXMucGFyc2VNYXAodG9rZW5zKTtcXG4gICAgfVxcbiAgICAvKipcXG4gICAgICogUGFyc2VzIHRoZSBidW1wIG1hcC5cXG4gICAgICpcXG4gICAgICogQHBhcmFtIHRva2VucyBsaXN0IG9mIHRva2VucyBmb3IgdGhlIGJ1bXAgZGlyZWNpdmVcXG4gICAgICovXFxuICAgIHBhcnNlX2J1bXAodG9rZW5zKSB7XFxuICAgICAgICB0aGlzLnBhcnNlX21hcF9idW1wKHRva2Vucyk7XFxuICAgIH1cXG4gICAgLyoqXFxuICAgICAqIFBhcnNlcyB0aGUgZGlzcCBtYXAuXFxuICAgICAqXFxuICAgICAqIEBwYXJhbSB0b2tlbnMgbGlzdCBvZiB0b2tlbnMgZm9yIHRoZSBkaXNwIGRpcmVjaXZlXFxuICAgICAqL1xcbiAgICBwYXJzZV9kaXNwKHRva2Vucykge1xcbiAgICAgICAgdGhpcy5jdXJyZW50TWF0ZXJpYWwubWFwRGlzcGxhY2VtZW50ID0gdGhpcy5wYXJzZU1hcCh0b2tlbnMpO1xcbiAgICB9XFxuICAgIC8qKlxcbiAgICAgKiBQYXJzZXMgdGhlIGRlY2FsIG1hcC5cXG4gICAgICpcXG4gICAgICogQHBhcmFtIHRva2VucyBsaXN0IG9mIHRva2VucyBmb3IgdGhlIG1hcF9kZWNhbCBkaXJlY2l2ZVxcbiAgICAgKi9cXG4gICAgcGFyc2VfZGVjYWwodG9rZW5zKSB7XFxuICAgICAgICB0aGlzLmN1cnJlbnRNYXRlcmlhbC5tYXBEZWNhbCA9IHRoaXMucGFyc2VNYXAodG9rZW5zKTtcXG4gICAgfVxcbiAgICAvKipcXG4gICAgICogUGFyc2VzIHRoZSByZWZsIG1hcC5cXG4gICAgICpcXG4gICAgICogQHBhcmFtIHRva2VucyBsaXN0IG9mIHRva2VucyBmb3IgdGhlIHJlZmwgZGlyZWNpdmVcXG4gICAgICovXFxuICAgIHBhcnNlX3JlZmwodG9rZW5zKSB7XFxuICAgICAgICB0aGlzLmN1cnJlbnRNYXRlcmlhbC5tYXBSZWZsZWN0aW9ucy5wdXNoKHRoaXMucGFyc2VNYXAodG9rZW5zKSk7XFxuICAgIH1cXG4gICAgLyoqXFxuICAgICAqIFBhcnNlcyB0aGUgTVRMIGZpbGUuXFxuICAgICAqXFxuICAgICAqIEl0ZXJhdGVzIGxpbmUgYnkgbGluZSBwYXJzaW5nIGVhY2ggTVRMIGRpcmVjdGl2ZS5cXG4gICAgICpcXG4gICAgICogVGhpcyBmdW5jdGlvbiBleHBlY3RzIHRoZSBmaXJzdCB0b2tlbiBpbiB0aGUgbGluZVxcbiAgICAgKiB0byBiZSBhIHZhbGlkIE1UTCBkaXJlY3RpdmUuIFRoYXQgdG9rZW4gaXMgdGhlbiB1c2VkXFxuICAgICAqIHRvIHRyeSBhbmQgcnVuIGEgbWV0aG9kIG9uIHRoaXMgY2xhc3MuIHBhcnNlX1tkaXJlY3RpdmVdXFxuICAgICAqIEUuZy4sIHRoZSBgbmV3bXRsYCBkaXJlY3RpdmUgd291bGQgdHJ5IHRvIGNhbGwgdGhlIG1ldGhvZFxcbiAgICAgKiBwYXJzZV9uZXdtdGwuIEVhY2ggcGFyc2luZyBmdW5jdGlvbiB0YWtlcyBpbiB0aGUgcmVtYWluaW5nXFxuICAgICAqIGxpc3Qgb2YgdG9rZW5zIGFuZCB1cGRhdGVzIHRoZSBjdXJyZW50TWF0ZXJpYWwgY2xhc3Mgd2l0aFxcbiAgICAgKiB0aGUgYXR0cmlidXRlcyBwcm92aWRlZC5cXG4gICAgICovXFxuICAgIHBhcnNlKCkge1xcbiAgICAgICAgY29uc3QgbGluZXMgPSB0aGlzLmRhdGEuc3BsaXQoL1xcXFxyP1xcXFxuLyk7XFxuICAgICAgICBmb3IgKGxldCBsaW5lIG9mIGxpbmVzKSB7XFxuICAgICAgICAgICAgbGluZSA9IGxpbmUudHJpbSgpO1xcbiAgICAgICAgICAgIGlmICghbGluZSB8fCBsaW5lLnN0YXJ0c1dpdGgoXCIjXCIpKSB7XFxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xcbiAgICAgICAgICAgIH1cXG4gICAgICAgICAgICBjb25zdCBbZGlyZWN0aXZlLCAuLi50b2tlbnNdID0gbGluZS5zcGxpdCgvXFxcXHMvKTtcXG4gICAgICAgICAgICBjb25zdCBwYXJzZU1ldGhvZCA9IHRoaXNbYHBhcnNlXyR7ZGlyZWN0aXZlfWBdO1xcbiAgICAgICAgICAgIGlmICghcGFyc2VNZXRob2QpIHtcXG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGBEb25cXCd0IGtub3cgaG93IHRvIHBhcnNlIHRoZSBkaXJlY3RpdmU6IFwiJHtkaXJlY3RpdmV9XCJgKTtcXG4gICAgICAgICAgICAgICAgY29udGludWU7XFxuICAgICAgICAgICAgfVxcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGBQYXJzaW5nIFwiJHtkaXJlY3RpdmV9XCIgd2l0aCB0b2tlbnM6ICR7dG9rZW5zfWApO1xcbiAgICAgICAgICAgIHBhcnNlTWV0aG9kLmJpbmQodGhpcykodG9rZW5zKTtcXG4gICAgICAgIH1cXG4gICAgICAgIC8vIHNvbWUgY2xlYW51cC4gVGhlc2UgZG9uXFwndCBuZWVkIHRvIGJlIGV4cG9zZWQgYXMgcHVibGljIGRhdGEuXFxuICAgICAgICBkZWxldGUgdGhpcy5kYXRhO1xcbiAgICAgICAgdGhpcy5jdXJyZW50TWF0ZXJpYWwgPSBTRU5USU5FTF9NQVRFUklBTDtcXG4gICAgfVxcbn1cXG5mdW5jdGlvbiBlbXB0eVRleHR1cmVPcHRpb25zKCkge1xcbiAgICByZXR1cm4ge1xcbiAgICAgICAgY29sb3JDb3JyZWN0aW9uOiBmYWxzZSxcXG4gICAgICAgIGhvcml6b250YWxCbGVuZGluZzogdHJ1ZSxcXG4gICAgICAgIHZlcnRpY2FsQmxlbmRpbmc6IHRydWUsXFxuICAgICAgICBib29zdE1pcE1hcFNoYXJwbmVzczogMCxcXG4gICAgICAgIG1vZGlmeVRleHR1cmVNYXA6IHtcXG4gICAgICAgICAgICBicmlnaHRuZXNzOiAwLFxcbiAgICAgICAgICAgIGNvbnRyYXN0OiAxLFxcbiAgICAgICAgfSxcXG4gICAgICAgIG9mZnNldDogeyB1OiAwLCB2OiAwLCB3OiAwIH0sXFxuICAgICAgICBzY2FsZTogeyB1OiAxLCB2OiAxLCB3OiAxIH0sXFxuICAgICAgICB0dXJidWxlbmNlOiB7IHU6IDAsIHY6IDAsIHc6IDAgfSxcXG4gICAgICAgIGNsYW1wOiBmYWxzZSxcXG4gICAgICAgIHRleHR1cmVSZXNvbHV0aW9uOiBudWxsLFxcbiAgICAgICAgYnVtcE11bHRpcGxpZXI6IDEsXFxuICAgICAgICBpbWZDaGFuOiBudWxsLFxcbiAgICAgICAgZmlsZW5hbWU6IFwiXCIsXFxuICAgIH07XFxufVxcblxcblxcbi8vIyBzb3VyY2VVUkw9d2VicGFjazovL09CSi8uL3NyYy9tYXRlcmlhbC50cz8nKX0sXCIuL3NyYy9tZXNoLnRzXCI6XG4vKiEqKioqKioqKioqKioqKioqKioqKiohKlxcXG4gICEqKiogLi9zcmMvbWVzaC50cyAqKiohXG4gIFxcKioqKioqKioqKioqKioqKioqKioqL1xuLyohIGV4cG9ydHMgcHJvdmlkZWQ6IGRlZmF1bHQgKi9mdW5jdGlvbihtb2R1bGUsX193ZWJwYWNrX2V4cG9ydHNfXyxfX3dlYnBhY2tfcmVxdWlyZV9fKXtcInVzZSBzdHJpY3RcIjtldmFsKCdfX3dlYnBhY2tfcmVxdWlyZV9fLnIoX193ZWJwYWNrX2V4cG9ydHNfXyk7XFxuLyogaGFybW9ueSBleHBvcnQgKGJpbmRpbmcpICovIF9fd2VicGFja19yZXF1aXJlX18uZChfX3dlYnBhY2tfZXhwb3J0c19fLCBcImRlZmF1bHRcIiwgZnVuY3Rpb24oKSB7IHJldHVybiBNZXNoOyB9KTtcXG4vKiBoYXJtb255IGltcG9ydCAqLyB2YXIgX2xheW91dF9fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fID0gX193ZWJwYWNrX3JlcXVpcmVfXygvKiEgLi9sYXlvdXQgKi8gXCIuL3NyYy9sYXlvdXQudHNcIik7XFxuXFxuLyoqXFxuICogVGhlIG1haW4gTWVzaCBjbGFzcy4gVGhlIGNvbnN0cnVjdG9yIHdpbGwgcGFyc2UgdGhyb3VnaCB0aGUgT0JKIGZpbGUgZGF0YVxcbiAqIGFuZCBjb2xsZWN0IHRoZSB2ZXJ0ZXgsIHZlcnRleCBub3JtYWwsIHRleHR1cmUsIGFuZCBmYWNlIGluZm9ybWF0aW9uLiBUaGlzXFxuICogaW5mb3JtYXRpb24gY2FuIHRoZW4gYmUgdXNlZCBsYXRlciBvbiB3aGVuIGNyZWF0aW5nIHlvdXIgVkJPcy4gU2VlXFxuICogT0JKLmluaXRNZXNoQnVmZmVycyBmb3IgYW4gZXhhbXBsZSBvZiBob3cgdG8gdXNlIHRoZSBuZXdseSBjcmVhdGVkIE1lc2hcXG4gKi9cXG5jbGFzcyBNZXNoIHtcXG4gICAgLyoqXFxuICAgICAqIENyZWF0ZSBhIE1lc2hcXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG9iamVjdERhdGEgLSBhIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiBhbiBPQkogZmlsZSB3aXRoXFxuICAgICAqICAgICBuZXdsaW5lcyBwcmVzZXJ2ZWQuXFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gYSBKUyBvYmplY3QgY29udGFpbmluZyB2YWxpZCBvcHRpb25zLiBTZWUgY2xhc3NcXG4gICAgICogICAgIGRvY3VtZW50YXRpb24gZm9yIG9wdGlvbnMuXFxuICAgICAqIEBwYXJhbSB7Ym9vbH0gb3B0aW9ucy5lbmFibGVXVGV4dHVyZUNvb3JkIC0gVGV4dHVyZSBjb29yZGluYXRlcyBjYW4gaGF2ZVxcbiAgICAgKiAgICAgYW4gb3B0aW9uYWwgXCJ3XCIgY29vcmRpbmF0ZSBhZnRlciB0aGUgdSBhbmQgdiBjb29yZGluYXRlcy4gVGhpcyBleHRyYVxcbiAgICAgKiAgICAgdmFsdWUgY2FuIGJlIHVzZWQgaW4gb3JkZXIgdG8gcGVyZm9ybSBmYW5jeSB0cmFuc2Zvcm1hdGlvbnMgb24gdGhlXFxuICAgICAqICAgICB0ZXh0dXJlcyB0aGVtc2VsdmVzLiBEZWZhdWx0IGlzIHRvIHRydW5jYXRlIHRvIG9ubHkgdGhlIHUgYW4gdlxcbiAgICAgKiAgICAgY29vcmRpbmF0ZXMuIFBhc3NpbmcgdHJ1ZSB3aWxsIHByb3ZpZGUgYSBkZWZhdWx0IHZhbHVlIG9mIDAgaW4gdGhlXFxuICAgICAqICAgICBldmVudCB0aGF0IGFueSBvciBhbGwgdGV4dHVyZSBjb29yZGluYXRlcyBkb25cXCd0IHByb3ZpZGUgYSB3IHZhbHVlLlxcbiAgICAgKiAgICAgQWx3YXlzIHVzZSB0aGUgdGV4dHVyZVN0cmlkZSBhdHRyaWJ1dGUgaW4gb3JkZXIgdG8gZGV0ZXJtaW5lIHRoZVxcbiAgICAgKiAgICAgc3RyaWRlIGxlbmd0aCBvZiB0aGUgdGV4dHVyZSBjb29yZGluYXRlcyB3aGVuIHJlbmRlcmluZyB0aGUgZWxlbWVudFxcbiAgICAgKiAgICAgYXJyYXkuXFxuICAgICAqIEBwYXJhbSB7Ym9vbH0gb3B0aW9ucy5jYWxjVGFuZ2VudHNBbmRCaXRhbmdlbnRzIC0gQ2FsY3VsYXRlIHRoZSB0YW5nZW50c1xcbiAgICAgKiAgICAgYW5kIGJpdGFuZ2VudHMgd2hlbiBsb2FkaW5nIG9mIHRoZSBPQkogaXMgY29tcGxldGVkLiBUaGlzIGFkZHMgdHdvIG5ld1xcbiAgICAgKiAgICAgYXR0cmlidXRlcyB0byB0aGUgTWVzaCBpbnN0YW5jZTogYHRhbmdlbnRzYCBhbmQgYGJpdGFuZ2VudHNgLlxcbiAgICAgKi9cXG4gICAgY29uc3RydWN0b3Iob2JqZWN0RGF0YSwgb3B0aW9ucykge1xcbiAgICAgICAgdGhpcy5uYW1lID0gXCJcIjtcXG4gICAgICAgIHRoaXMuaW5kaWNlc1Blck1hdGVyaWFsID0gW107XFxuICAgICAgICB0aGlzLm1hdGVyaWFsc0J5SW5kZXggPSB7fTtcXG4gICAgICAgIHRoaXMudGFuZ2VudHMgPSBbXTtcXG4gICAgICAgIHRoaXMuYml0YW5nZW50cyA9IFtdO1xcbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XFxuICAgICAgICBvcHRpb25zLm1hdGVyaWFscyA9IG9wdGlvbnMubWF0ZXJpYWxzIHx8IHt9O1xcbiAgICAgICAgb3B0aW9ucy5lbmFibGVXVGV4dHVyZUNvb3JkID0gISFvcHRpb25zLmVuYWJsZVdUZXh0dXJlQ29vcmQ7XFxuICAgICAgICAvLyB0aGUgbGlzdCBvZiB1bmlxdWUgdmVydGV4LCBub3JtYWwsIHRleHR1cmUsIGF0dHJpYnV0ZXNcXG4gICAgICAgIHRoaXMudmVydGV4Tm9ybWFscyA9IFtdO1xcbiAgICAgICAgdGhpcy50ZXh0dXJlcyA9IFtdO1xcbiAgICAgICAgLy8gdGhlIGluZGljaWVzIHRvIGRyYXcgdGhlIGZhY2VzXFxuICAgICAgICB0aGlzLmluZGljZXMgPSBbXTtcXG4gICAgICAgIHRoaXMudGV4dHVyZVN0cmlkZSA9IG9wdGlvbnMuZW5hYmxlV1RleHR1cmVDb29yZCA/IDMgOiAyO1xcbiAgICAgICAgLypcXG4gICAgICAgIFRoZSBPQkogZmlsZSBmb3JtYXQgZG9lcyBhIHNvcnQgb2YgY29tcHJlc3Npb24gd2hlbiBzYXZpbmcgYSBtb2RlbCBpbiBhXFxuICAgICAgICBwcm9ncmFtIGxpa2UgQmxlbmRlci4gVGhlcmUgYXJlIGF0IGxlYXN0IDMgc2VjdGlvbnMgKDQgaW5jbHVkaW5nIHRleHR1cmVzKVxcbiAgICAgICAgd2l0aGluIHRoZSBmaWxlLiBFYWNoIGxpbmUgaW4gYSBzZWN0aW9uIGJlZ2lucyB3aXRoIHRoZSBzYW1lIHN0cmluZzpcXG4gICAgICAgICAgKiBcXCd2XFwnOiBpbmRpY2F0ZXMgdmVydGV4IHNlY3Rpb25cXG4gICAgICAgICAgKiBcXCd2blxcJzogaW5kaWNhdGVzIHZlcnRleCBub3JtYWwgc2VjdGlvblxcbiAgICAgICAgICAqIFxcJ2ZcXCc6IGluZGljYXRlcyB0aGUgZmFjZXMgc2VjdGlvblxcbiAgICAgICAgICAqIFxcJ3Z0XFwnOiBpbmRpY2F0ZXMgdmVydGV4IHRleHR1cmUgc2VjdGlvbiAoaWYgdGV4dHVyZXMgd2VyZSB1c2VkIG9uIHRoZSBtb2RlbClcXG4gICAgICAgIEVhY2ggb2YgdGhlIGFib3ZlIHNlY3Rpb25zIChleGNlcHQgZm9yIHRoZSBmYWNlcyBzZWN0aW9uKSBpcyBhIGxpc3Qvc2V0IG9mXFxuICAgICAgICB1bmlxdWUgdmVydGljZXMuXFxuXFxuICAgICAgICBFYWNoIGxpbmUgb2YgdGhlIGZhY2VzIHNlY3Rpb24gY29udGFpbnMgYSBsaXN0IG9mXFxuICAgICAgICAodmVydGV4LCBbdGV4dHVyZV0sIG5vcm1hbCkgZ3JvdXBzLlxcblxcbiAgICAgICAgKipOb3RlOioqIFRoZSBmb2xsb3dpbmcgZG9jdW1lbnRhdGlvbiB3aWxsIHVzZSBhIGNhcGl0YWwgXCJWXCIgVmVydGV4IHRvXFxuICAgICAgICBkZW5vdGUgdGhlIGFib3ZlICh2ZXJ0ZXgsIFt0ZXh0dXJlXSwgbm9ybWFsKSBncm91cHMgd2hlcmVhcyBhIGxvd2VyY2FzZVxcbiAgICAgICAgXCJ2XCIgdmVydGV4IGlzIHVzZWQgdG8gZGVub3RlIGFuIFgsIFksIFogY29vcmRpbmF0ZS5cXG5cXG4gICAgICAgIFNvbWUgZXhhbXBsZXM6XFxuICAgICAgICAgICAgLy8gdGhlIHRleHR1cmUgaW5kZXggaXMgb3B0aW9uYWwsIGJvdGggZm9ybWF0cyBhcmUgcG9zc2libGUgZm9yIG1vZGVsc1xcbiAgICAgICAgICAgIC8vIHdpdGhvdXQgYSB0ZXh0dXJlIGFwcGxpZWRcXG4gICAgICAgICAgICBmIDEvMjUgMTgvNDYgMTIvMzFcXG4gICAgICAgICAgICBmIDEvLzI1IDE4Ly80NiAxMi8vMzFcXG5cXG4gICAgICAgICAgICAvLyBBIDMgdmVydGV4IGZhY2Ugd2l0aCB0ZXh0dXJlIGluZGljZXNcXG4gICAgICAgICAgICBmIDE2LzkyLzExIDE0LzEwMS8yMiAxLzY5LzFcXG5cXG4gICAgICAgICAgICAvLyBBIDQgdmVydGV4IGZhY2VcXG4gICAgICAgICAgICBmIDE2LzkyLzExIDQwLzEwOS80MCAzOC8xMTQvMzggMTQvMTAxLzIyXFxuXFxuICAgICAgICBUaGUgZmlyc3QgdHdvIGxpbmVzIGFyZSBleGFtcGxlcyBvZiBhIDMgdmVydGV4IGZhY2Ugd2l0aG91dCBhIHRleHR1cmUgYXBwbGllZC5cXG4gICAgICAgIFRoZSBzZWNvbmQgaXMgYW4gZXhhbXBsZSBvZiBhIDMgdmVydGV4IGZhY2Ugd2l0aCBhIHRleHR1cmUgYXBwbGllZC5cXG4gICAgICAgIFRoZSB0aGlyZCBpcyBhbiBleGFtcGxlIG9mIGEgNCB2ZXJ0ZXggZmFjZS4gTm90ZTogYSBmYWNlIGNhbiBjb250YWluIE5cXG4gICAgICAgIG51bWJlciBvZiB2ZXJ0aWNlcy5cXG5cXG4gICAgICAgIEVhY2ggbnVtYmVyIHRoYXQgYXBwZWFycyBpbiBvbmUgb2YgdGhlIGdyb3VwcyBpcyBhIDEtYmFzZWQgaW5kZXhcXG4gICAgICAgIGNvcnJlc3BvbmRpbmcgdG8gYW4gaXRlbSBmcm9tIHRoZSBvdGhlciBzZWN0aW9ucyAobWVhbmluZyB0aGF0IGluZGV4aW5nXFxuICAgICAgICBzdGFydHMgYXQgb25lIGFuZCAqbm90KiB6ZXJvKS5cXG5cXG4gICAgICAgIEZvciBleGFtcGxlOlxcbiAgICAgICAgICAgIGBmIDE2LzkyLzExYCBpcyBzYXlpbmcgdG9cXG4gICAgICAgICAgICAgIC0gdGFrZSB0aGUgMTZ0aCBlbGVtZW50IGZyb20gdGhlIFt2XSB2ZXJ0ZXggYXJyYXlcXG4gICAgICAgICAgICAgIC0gdGFrZSB0aGUgOTJuZCBlbGVtZW50IGZyb20gdGhlIFt2dF0gdGV4dHVyZSBhcnJheVxcbiAgICAgICAgICAgICAgLSB0YWtlIHRoZSAxMXRoIGVsZW1lbnQgZnJvbSB0aGUgW3ZuXSBub3JtYWwgYXJyYXlcXG4gICAgICAgICAgICBhbmQgdG9nZXRoZXIgdGhleSBtYWtlIGEgdW5pcXVlIHZlcnRleC5cXG4gICAgICAgIFVzaW5nIGFsbCAzKyB1bmlxdWUgVmVydGljZXMgZnJvbSB0aGUgZmFjZSBsaW5lIHdpbGwgcHJvZHVjZSBhIHBvbHlnb24uXFxuXFxuICAgICAgICBOb3csIHlvdSBjb3VsZCBqdXN0IGdvIHRocm91Z2ggdGhlIE9CSiBmaWxlIGFuZCBjcmVhdGUgYSBuZXcgdmVydGV4IGZvclxcbiAgICAgICAgZWFjaCBmYWNlIGxpbmUgYW5kIFdlYkdMIHdpbGwgZHJhdyB3aGF0IGFwcGVhcnMgdG8gYmUgdGhlIHNhbWUgbW9kZWwuXFxuICAgICAgICBIb3dldmVyLCB2ZXJ0aWNlcyB3aWxsIGJlIG92ZXJsYXBwZWQgYW5kIGR1cGxpY2F0ZWQgYWxsIG92ZXIgdGhlIHBsYWNlLlxcblxcbiAgICAgICAgQ29uc2lkZXIgYSBjdWJlIGluIDNEIHNwYWNlIGNlbnRlcmVkIGFib3V0IHRoZSBvcmlnaW4gYW5kIGVhY2ggc2lkZSBpc1xcbiAgICAgICAgMiB1bml0cyBsb25nLiBUaGUgZnJvbnQgZmFjZSAod2l0aCB0aGUgcG9zaXRpdmUgWi1heGlzIHBvaW50aW5nIHRvd2FyZHNcXG4gICAgICAgIHlvdSkgd291bGQgaGF2ZSBhIFRvcCBSaWdodCB2ZXJ0ZXggKGxvb2tpbmcgb3J0aG9nb25hbCB0byBpdHMgbm9ybWFsKVxcbiAgICAgICAgbWFwcGVkIGF0ICgxLDEsMSkgVGhlIHJpZ2h0IGZhY2Ugd291bGQgaGF2ZSBhIFRvcCBMZWZ0IHZlcnRleCAobG9va2luZ1xcbiAgICAgICAgb3J0aG9nb25hbCB0byBpdHMgbm9ybWFsKSBhdCAoMSwxLDEpIGFuZCB0aGUgdG9wIGZhY2Ugd291bGQgaGF2ZSBhIEJvdHRvbVxcbiAgICAgICAgUmlnaHQgdmVydGV4IChsb29raW5nIG9ydGhvZ29uYWwgdG8gaXRzIG5vcm1hbCkgYXQgKDEsMSwxKS4gRWFjaCBmYWNlXFxuICAgICAgICBoYXMgYSB2ZXJ0ZXggYXQgdGhlIHNhbWUgY29vcmRpbmF0ZXMsIGhvd2V2ZXIsIHRocmVlIGRpc3RpbmN0IHZlcnRpY2VzXFxuICAgICAgICB3aWxsIGJlIGRyYXduIGF0IHRoZSBzYW1lIHNwb3QuXFxuXFxuICAgICAgICBUbyBzb2x2ZSB0aGUgaXNzdWUgb2YgZHVwbGljYXRlIFZlcnRpY2VzICh0aGUgYCh2ZXJ0ZXgsIFt0ZXh0dXJlXSwgbm9ybWFsKWBcXG4gICAgICAgIGdyb3VwcyksIHdoaWxlIGl0ZXJhdGluZyB0aHJvdWdoIHRoZSBmYWNlIGxpbmVzLCB3aGVuIGEgZ3JvdXAgaXMgZW5jb3VudGVyZWRcXG4gICAgICAgIHRoZSB3aG9sZSBncm91cCBzdHJpbmcgKFxcJzE2LzkyLzExXFwnKSBpcyBjaGVja2VkIHRvIHNlZSBpZiBpdCBleGlzdHMgaW4gdGhlXFxuICAgICAgICBwYWNrZWQuaGFzaGluZGljZXMgb2JqZWN0LCBhbmQgaWYgaXQgZG9lc25cXCd0LCB0aGUgaW5kaWNlcyBpdCBzcGVjaWZpZXNcXG4gICAgICAgIGFyZSB1c2VkIHRvIGxvb2sgdXAgZWFjaCBhdHRyaWJ1dGUgaW4gdGhlIGNvcnJlc3BvbmRpbmcgYXR0cmlidXRlIGFycmF5c1xcbiAgICAgICAgYWxyZWFkeSBjcmVhdGVkLiBUaGUgdmFsdWVzIGFyZSB0aGVuIGNvcGllZCB0byB0aGUgY29ycmVzcG9uZGluZyB1bnBhY2tlZFxcbiAgICAgICAgYXJyYXkgKGZsYXR0ZW5lZCB0byBwbGF5IG5pY2Ugd2l0aCBXZWJHTFxcJ3MgRUxFTUVOVF9BUlJBWV9CVUZGRVIgaW5kZXhpbmcpLFxcbiAgICAgICAgdGhlIGdyb3VwIHN0cmluZyBpcyBhZGRlZCB0byB0aGUgaGFzaGluZGljZXMgc2V0IGFuZCB0aGUgY3VycmVudCB1bnBhY2tlZFxcbiAgICAgICAgaW5kZXggaXMgdXNlZCBhcyB0aGlzIGhhc2hpbmRpY2VzIHZhbHVlIHNvIHRoYXQgdGhlIGdyb3VwIG9mIGVsZW1lbnRzIGNhblxcbiAgICAgICAgYmUgcmV1c2VkLiBUaGUgdW5wYWNrZWQgaW5kZXggaXMgaW5jcmVtZW50ZWQuIElmIHRoZSBncm91cCBzdHJpbmcgYWxyZWFkeVxcbiAgICAgICAgZXhpc3RzIGluIHRoZSBoYXNoaW5kaWNlcyBvYmplY3QsIGl0cyBjb3JyZXNwb25kaW5nIHZhbHVlIGlzIHRoZSBpbmRleCBvZlxcbiAgICAgICAgdGhhdCBncm91cCBhbmQgaXMgYXBwZW5kZWQgdG8gdGhlIHVucGFja2VkIGluZGljZXMgYXJyYXkuXFxuICAgICAgICovXFxuICAgICAgICBjb25zdCB2ZXJ0cyA9IFtdO1xcbiAgICAgICAgY29uc3QgdmVydE5vcm1hbHMgPSBbXTtcXG4gICAgICAgIGNvbnN0IHRleHR1cmVzID0gW107XFxuICAgICAgICBjb25zdCBtYXRlcmlhbE5hbWVzQnlJbmRleCA9IFtdO1xcbiAgICAgICAgY29uc3QgbWF0ZXJpYWxJbmRpY2VzQnlOYW1lID0ge307XFxuICAgICAgICAvLyBrZWVwIHRyYWNrIG9mIHdoYXQgbWF0ZXJpYWwgd2VcXCd2ZSBzZWVuIGxhc3RcXG4gICAgICAgIGxldCBjdXJyZW50TWF0ZXJpYWxJbmRleCA9IC0xO1xcbiAgICAgICAgbGV0IGN1cnJlbnRPYmplY3RCeU1hdGVyaWFsSW5kZXggPSAwO1xcbiAgICAgICAgLy8gdW5wYWNraW5nIHN0dWZmXFxuICAgICAgICBjb25zdCB1bnBhY2tlZCA9IHtcXG4gICAgICAgICAgICB2ZXJ0czogW10sXFxuICAgICAgICAgICAgbm9ybXM6IFtdLFxcbiAgICAgICAgICAgIHRleHR1cmVzOiBbXSxcXG4gICAgICAgICAgICBoYXNoaW5kaWNlczoge30sXFxuICAgICAgICAgICAgaW5kaWNlczogW1tdXSxcXG4gICAgICAgICAgICBtYXRlcmlhbEluZGljZXM6IFtdLFxcbiAgICAgICAgICAgIGluZGV4OiAwLFxcbiAgICAgICAgfTtcXG4gICAgICAgIGNvbnN0IFZFUlRFWF9SRSA9IC9edlxcXFxzLztcXG4gICAgICAgIGNvbnN0IE5PUk1BTF9SRSA9IC9edm5cXFxccy87XFxuICAgICAgICBjb25zdCBURVhUVVJFX1JFID0gL152dFxcXFxzLztcXG4gICAgICAgIGNvbnN0IEZBQ0VfUkUgPSAvXmZcXFxccy87XFxuICAgICAgICBjb25zdCBXSElURVNQQUNFX1JFID0gL1xcXFxzKy87XFxuICAgICAgICBjb25zdCBVU0VfTUFURVJJQUxfUkUgPSAvXnVzZW10bC87XFxuICAgICAgICAvLyBhcnJheSBvZiBsaW5lcyBzZXBhcmF0ZWQgYnkgdGhlIG5ld2xpbmVcXG4gICAgICAgIGNvbnN0IGxpbmVzID0gb2JqZWN0RGF0YS5zcGxpdChcIlxcXFxuXCIpO1xcbiAgICAgICAgZm9yIChsZXQgbGluZSBvZiBsaW5lcykge1xcbiAgICAgICAgICAgIGxpbmUgPSBsaW5lLnRyaW0oKTtcXG4gICAgICAgICAgICBpZiAoIWxpbmUgfHwgbGluZS5zdGFydHNXaXRoKFwiI1wiKSkge1xcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcXG4gICAgICAgICAgICB9XFxuICAgICAgICAgICAgY29uc3QgZWxlbWVudHMgPSBsaW5lLnNwbGl0KFdISVRFU1BBQ0VfUkUpO1xcbiAgICAgICAgICAgIGVsZW1lbnRzLnNoaWZ0KCk7XFxuICAgICAgICAgICAgaWYgKFZFUlRFWF9SRS50ZXN0KGxpbmUpKSB7XFxuICAgICAgICAgICAgICAgIC8vIGlmIHRoaXMgaXMgYSB2ZXJ0ZXhcXG4gICAgICAgICAgICAgICAgdmVydHMucHVzaCguLi5lbGVtZW50cyk7XFxuICAgICAgICAgICAgfVxcbiAgICAgICAgICAgIGVsc2UgaWYgKE5PUk1BTF9SRS50ZXN0KGxpbmUpKSB7XFxuICAgICAgICAgICAgICAgIC8vIGlmIHRoaXMgaXMgYSB2ZXJ0ZXggbm9ybWFsXFxuICAgICAgICAgICAgICAgIHZlcnROb3JtYWxzLnB1c2goLi4uZWxlbWVudHMpO1xcbiAgICAgICAgICAgIH1cXG4gICAgICAgICAgICBlbHNlIGlmIChURVhUVVJFX1JFLnRlc3QobGluZSkpIHtcXG4gICAgICAgICAgICAgICAgbGV0IGNvb3JkcyA9IGVsZW1lbnRzO1xcbiAgICAgICAgICAgICAgICAvLyBieSBkZWZhdWx0LCB0aGUgbG9hZGVyIHdpbGwgb25seSBsb29rIGF0IHRoZSBVIGFuZCBWXFxuICAgICAgICAgICAgICAgIC8vIGNvb3JkaW5hdGVzIG9mIHRoZSB2dCBkZWNsYXJhdGlvbi4gU28sIHRoaXMgdHJ1bmNhdGVzIHRoZVxcbiAgICAgICAgICAgICAgICAvLyBlbGVtZW50cyB0byBvbmx5IHRob3NlIDIgdmFsdWVzLiBJZiBXIHRleHR1cmUgY29vcmRpbmF0ZVxcbiAgICAgICAgICAgICAgICAvLyBzdXBwb3J0IGlzIGVuYWJsZWQsIHRoZW4gdGhlIHRleHR1cmUgY29vcmRpbmF0ZSBpc1xcbiAgICAgICAgICAgICAgICAvLyBleHBlY3RlZCB0byBoYXZlIHRocmVlIHZhbHVlcyBpbiBpdC5cXG4gICAgICAgICAgICAgICAgaWYgKGVsZW1lbnRzLmxlbmd0aCA+IDIgJiYgIW9wdGlvbnMuZW5hYmxlV1RleHR1cmVDb29yZCkge1xcbiAgICAgICAgICAgICAgICAgICAgY29vcmRzID0gZWxlbWVudHMuc2xpY2UoMCwgMik7XFxuICAgICAgICAgICAgICAgIH1cXG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoZWxlbWVudHMubGVuZ3RoID09PSAyICYmIG9wdGlvbnMuZW5hYmxlV1RleHR1cmVDb29yZCkge1xcbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgZm9yIHNvbWUgcmVhc29uIFcgdGV4dHVyZSBjb29yZGluYXRlIHN1cHBvcnQgaXMgZW5hYmxlZFxcbiAgICAgICAgICAgICAgICAgICAgLy8gYW5kIG9ubHkgdGhlIFUgYW5kIFYgY29vcmRpbmF0ZXMgYXJlIGdpdmVuLCB0aGVuIHdlIHN1cHBseVxcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhlIGRlZmF1bHQgdmFsdWUgb2YgMCBzbyB0aGF0IHRoZSBzdHJpZGUgbGVuZ3RoIGlzIGNvcnJlY3RcXG4gICAgICAgICAgICAgICAgICAgIC8vIHdoZW4gdGhlIHRleHR1cmVzIGFyZSB1bnBhY2tlZCBiZWxvdy5cXG4gICAgICAgICAgICAgICAgICAgIGNvb3Jkcy5wdXNoKFwiMFwiKTtcXG4gICAgICAgICAgICAgICAgfVxcbiAgICAgICAgICAgICAgICB0ZXh0dXJlcy5wdXNoKC4uLmNvb3Jkcyk7XFxuICAgICAgICAgICAgfVxcbiAgICAgICAgICAgIGVsc2UgaWYgKFVTRV9NQVRFUklBTF9SRS50ZXN0KGxpbmUpKSB7XFxuICAgICAgICAgICAgICAgIGNvbnN0IG1hdGVyaWFsTmFtZSA9IGVsZW1lbnRzWzBdO1xcbiAgICAgICAgICAgICAgICAvLyBjaGVjayB0byBzZWUgaWYgd2VcXCd2ZSBldmVyIHNlZW4gaXQgYmVmb3JlXFxuICAgICAgICAgICAgICAgIGlmICghKG1hdGVyaWFsTmFtZSBpbiBtYXRlcmlhbEluZGljZXNCeU5hbWUpKSB7XFxuICAgICAgICAgICAgICAgICAgICAvLyBuZXcgbWF0ZXJpYWwgd2VcXCd2ZSBuZXZlciBzZWVuXFxuICAgICAgICAgICAgICAgICAgICBtYXRlcmlhbE5hbWVzQnlJbmRleC5wdXNoKG1hdGVyaWFsTmFtZSk7XFxuICAgICAgICAgICAgICAgICAgICBtYXRlcmlhbEluZGljZXNCeU5hbWVbbWF0ZXJpYWxOYW1lXSA9IG1hdGVyaWFsTmFtZXNCeUluZGV4Lmxlbmd0aCAtIDE7XFxuICAgICAgICAgICAgICAgICAgICAvLyBwdXNoIG5ldyBhcnJheSBpbnRvIGluZGljZXNcXG4gICAgICAgICAgICAgICAgICAgIC8vIGFscmVhZHkgY29udGFpbnMgYW4gYXJyYXkgYXQgaW5kZXggemVybywgZG9uXFwndCBhZGRcXG4gICAgICAgICAgICAgICAgICAgIGlmIChtYXRlcmlhbEluZGljZXNCeU5hbWVbbWF0ZXJpYWxOYW1lXSA+IDApIHtcXG4gICAgICAgICAgICAgICAgICAgICAgICB1bnBhY2tlZC5pbmRpY2VzLnB1c2goW10pO1xcbiAgICAgICAgICAgICAgICAgICAgfVxcbiAgICAgICAgICAgICAgICB9XFxuICAgICAgICAgICAgICAgIC8vIGtlZXAgdHJhY2sgb2YgdGhlIGN1cnJlbnQgbWF0ZXJpYWwgaW5kZXhcXG4gICAgICAgICAgICAgICAgY3VycmVudE1hdGVyaWFsSW5kZXggPSBtYXRlcmlhbEluZGljZXNCeU5hbWVbbWF0ZXJpYWxOYW1lXTtcXG4gICAgICAgICAgICAgICAgLy8gdXBkYXRlIGN1cnJlbnQgaW5kZXggYXJyYXlcXG4gICAgICAgICAgICAgICAgY3VycmVudE9iamVjdEJ5TWF0ZXJpYWxJbmRleCA9IGN1cnJlbnRNYXRlcmlhbEluZGV4O1xcbiAgICAgICAgICAgIH1cXG4gICAgICAgICAgICBlbHNlIGlmIChGQUNFX1JFLnRlc3QobGluZSkpIHtcXG4gICAgICAgICAgICAgICAgLy8gaWYgdGhpcyBpcyBhIGZhY2VcXG4gICAgICAgICAgICAgICAgLypcXG4gICAgICAgICAgICAgICAgc3BsaXQgdGhpcyBmYWNlIGludG8gYW4gYXJyYXkgb2YgVmVydGV4IGdyb3Vwc1xcbiAgICAgICAgICAgICAgICBmb3IgZXhhbXBsZTpcXG4gICAgICAgICAgICAgICAgICAgZiAxNi85Mi8xMSAxNC8xMDEvMjIgMS82OS8xXFxuICAgICAgICAgICAgICAgIGJlY29tZXM6XFxuICAgICAgICAgICAgICAgICAgW1xcJzE2LzkyLzExXFwnLCBcXCcxNC8xMDEvMjJcXCcsIFxcJzEvNjkvMVxcJ107XFxuICAgICAgICAgICAgICAgICovXFxuICAgICAgICAgICAgICAgIGNvbnN0IHRyaWFuZ2xlcyA9IHRyaWFuZ3VsYXRlKGVsZW1lbnRzKTtcXG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCB0cmlhbmdsZSBvZiB0cmlhbmdsZXMpIHtcXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSAwLCBlbGVMZW4gPSB0cmlhbmdsZS5sZW5ndGg7IGogPCBlbGVMZW47IGorKykge1xcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGhhc2ggPSB0cmlhbmdsZVtqXSArIFwiLFwiICsgY3VycmVudE1hdGVyaWFsSW5kZXg7XFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGhhc2ggaW4gdW5wYWNrZWQuaGFzaGluZGljZXMpIHtcXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5wYWNrZWQuaW5kaWNlc1tjdXJyZW50T2JqZWN0QnlNYXRlcmlhbEluZGV4XS5wdXNoKHVucGFja2VkLmhhc2hpbmRpY2VzW2hhc2hdKTtcXG4gICAgICAgICAgICAgICAgICAgICAgICB9XFxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qXFxuICAgICAgICAgICAgICAgICAgICAgICAgRWFjaCBlbGVtZW50IG9mIHRoZSBmYWNlIGxpbmUgYXJyYXkgaXMgYSBWZXJ0ZXggd2hpY2ggaGFzIGl0c1xcbiAgICAgICAgICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXMgZGVsaW1pdGVkIGJ5IGEgZm9yd2FyZCBzbGFzaC4gVGhpcyB3aWxsIHNlcGFyYXRlXFxuICAgICAgICAgICAgICAgICAgICAgICAgZWFjaCBhdHRyaWJ1dGUgaW50byBhbm90aGVyIGFycmF5OlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXCcxOS85Mi8xMVxcJ1xcbiAgICAgICAgICAgICAgICAgICAgICAgIGJlY29tZXM6XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFZlcnRleCA9IFtcXCcxOVxcJywgXFwnOTJcXCcsIFxcJzExXFwnXTtcXG4gICAgICAgICAgICAgICAgICAgICAgICB3aGVyZVxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBWZXJ0ZXhbMF0gaXMgdGhlIHZlcnRleCBpbmRleFxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBWZXJ0ZXhbMV0gaXMgdGhlIHRleHR1cmUgaW5kZXhcXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgVmVydGV4WzJdIGlzIHRoZSBub3JtYWwgaW5kZXhcXG4gICAgICAgICAgICAgICAgICAgICAgICAgVGhpbmsgb2YgZmFjZXMgaGF2aW5nIFZlcnRpY2VzIHdoaWNoIGFyZSBjb21wcmlzZWQgb2YgdGhlXFxuICAgICAgICAgICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXMgbG9jYXRpb24gKHYpLCB0ZXh0dXJlICh2dCksIGFuZCBub3JtYWwgKHZuKS5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgKi9cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmVydGV4ID0gdHJpYW5nbGVbal0uc3BsaXQoXCIvXCIpO1xcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpdFxcJ3MgcG9zc2libGUgZm9yIGZhY2VzIHRvIG9ubHkgc3BlY2lmeSB0aGUgdmVydGV4XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFuZCB0aGUgbm9ybWFsLiBJbiB0aGlzIGNhc2UsIHZlcnRleCB3aWxsIG9ubHkgaGF2ZVxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBhIGxlbmd0aCBvZiAyIGFuZCBub3QgMyBhbmQgdGhlIG5vcm1hbCB3aWxsIGJlIHRoZVxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBzZWNvbmQgaXRlbSBpbiB0aGUgbGlzdCB3aXRoIGFuIGluZGV4IG9mIDEuXFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5vcm1hbEluZGV4ID0gdmVydGV4Lmxlbmd0aCAtIDE7XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qXFxuICAgICAgICAgICAgICAgICAgICAgICAgIFRoZSB2ZXJ0cywgdGV4dHVyZXMsIGFuZCB2ZXJ0Tm9ybWFscyBhcnJheXMgZWFjaCBjb250YWluIGFcXG4gICAgICAgICAgICAgICAgICAgICAgICAgZmxhdHRlbmQgYXJyYXkgb2YgY29vcmRpbmF0ZXMuXFxuXFxuICAgICAgICAgICAgICAgICAgICAgICAgIEJlY2F1c2UgaXQgZ2V0cyBjb25mdXNpbmcgYnkgcmVmZXJyaW5nIHRvIFZlcnRleCBhbmQgdGhlblxcbiAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJ0ZXggKGJvdGggYXJlIGRpZmZlcmVudCBpbiBteSBkZXNjcmlwdGlvbnMpIEkgd2lsbCBleHBsYWluXFxuICAgICAgICAgICAgICAgICAgICAgICAgIHdoYXRcXCdzIGdvaW5nIG9uIHVzaW5nIHRoZSB2ZXJ0ZXhOb3JtYWxzIGFycmF5OlxcblxcbiAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJ0ZXhbMl0gd2lsbCBjb250YWluIHRoZSBvbmUtYmFzZWQgaW5kZXggb2YgdGhlIHZlcnRleE5vcm1hbHNcXG4gICAgICAgICAgICAgICAgICAgICAgICAgc2VjdGlvbiAodm4pLiBPbmUgaXMgc3VidHJhY3RlZCBmcm9tIHRoaXMgaW5kZXggbnVtYmVyIHRvIHBsYXlcXG4gICAgICAgICAgICAgICAgICAgICAgICAgbmljZSB3aXRoIGphdmFzY3JpcHRcXCdzIHplcm8tYmFzZWQgYXJyYXkgaW5kZXhpbmcuXFxuXFxuICAgICAgICAgICAgICAgICAgICAgICAgIEJlY2F1c2UgdmVydGV4Tm9ybWFsIGlzIGEgZmxhdHRlbmVkIGFycmF5IG9mIHgsIHksIHogdmFsdWVzLFxcbiAgICAgICAgICAgICAgICAgICAgICAgICBzaW1wbGUgcG9pbnRlciBhcml0aG1ldGljIGlzIHVzZWQgdG8gc2tpcCB0byB0aGUgc3RhcnQgb2YgdGhlXFxuICAgICAgICAgICAgICAgICAgICAgICAgIHZlcnRleE5vcm1hbCwgdGhlbiB0aGUgb2Zmc2V0IGlzIGFkZGVkIHRvIGdldCB0aGUgY29ycmVjdFxcbiAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQ6ICswIGlzIHgsICsxIGlzIHksICsyIGlzIHouXFxuXFxuICAgICAgICAgICAgICAgICAgICAgICAgIFRoaXMgc2FtZSBwcm9jZXNzIGlzIHJlcGVhdGVkIGZvciB2ZXJ0cyBhbmQgdGV4dHVyZXMuXFxuICAgICAgICAgICAgICAgICAgICAgICAgICovXFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFZlcnRleCBwb3NpdGlvblxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bnBhY2tlZC52ZXJ0cy5wdXNoKCt2ZXJ0c1soK3ZlcnRleFswXSAtIDEpICogMyArIDBdKTtcXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5wYWNrZWQudmVydHMucHVzaCgrdmVydHNbKCt2ZXJ0ZXhbMF0gLSAxKSAqIDMgKyAxXSk7XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVucGFja2VkLnZlcnRzLnB1c2goK3ZlcnRzWygrdmVydGV4WzBdIC0gMSkgKiAzICsgMl0pO1xcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBWZXJ0ZXggdGV4dHVyZXNcXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRleHR1cmVzLmxlbmd0aCkge1xcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RyaWRlID0gb3B0aW9ucy5lbmFibGVXVGV4dHVyZUNvb3JkID8gMyA6IDI7XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bnBhY2tlZC50ZXh0dXJlcy5wdXNoKCt0ZXh0dXJlc1soK3ZlcnRleFsxXSAtIDEpICogc3RyaWRlICsgMF0pO1xcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5wYWNrZWQudGV4dHVyZXMucHVzaCgrdGV4dHVyZXNbKCt2ZXJ0ZXhbMV0gLSAxKSAqIHN0cmlkZSArIDFdKTtcXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLmVuYWJsZVdUZXh0dXJlQ29vcmQpIHtcXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bnBhY2tlZC50ZXh0dXJlcy5wdXNoKCt0ZXh0dXJlc1soK3ZlcnRleFsxXSAtIDEpICogc3RyaWRlICsgMl0pO1xcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFZlcnRleCBub3JtYWxzXFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVucGFja2VkLm5vcm1zLnB1c2goK3ZlcnROb3JtYWxzWygrdmVydGV4W25vcm1hbEluZGV4XSAtIDEpICogMyArIDBdKTtcXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5wYWNrZWQubm9ybXMucHVzaCgrdmVydE5vcm1hbHNbKCt2ZXJ0ZXhbbm9ybWFsSW5kZXhdIC0gMSkgKiAzICsgMV0pO1xcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bnBhY2tlZC5ub3Jtcy5wdXNoKCt2ZXJ0Tm9ybWFsc1soK3ZlcnRleFtub3JtYWxJbmRleF0gLSAxKSAqIDMgKyAyXSk7XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFZlcnRleCBtYXRlcmlhbCBpbmRpY2VzXFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVucGFja2VkLm1hdGVyaWFsSW5kaWNlcy5wdXNoKGN1cnJlbnRNYXRlcmlhbEluZGV4KTtcXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYWRkIHRoZSBuZXdseSBjcmVhdGVkIFZlcnRleCB0byB0aGUgbGlzdCBvZiBpbmRpY2VzXFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVucGFja2VkLmhhc2hpbmRpY2VzW2hhc2hdID0gdW5wYWNrZWQuaW5kZXg7XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVucGFja2VkLmluZGljZXNbY3VycmVudE9iamVjdEJ5TWF0ZXJpYWxJbmRleF0ucHVzaCh1bnBhY2tlZC5oYXNoaW5kaWNlc1toYXNoXSk7XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGluY3JlbWVudCB0aGUgY291bnRlclxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bnBhY2tlZC5pbmRleCArPSAxO1xcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cXG4gICAgICAgICAgICAgICAgICAgIH1cXG4gICAgICAgICAgICAgICAgfVxcbiAgICAgICAgICAgIH1cXG4gICAgICAgIH1cXG4gICAgICAgIHRoaXMudmVydGljZXMgPSB1bnBhY2tlZC52ZXJ0cztcXG4gICAgICAgIHRoaXMudmVydGV4Tm9ybWFscyA9IHVucGFja2VkLm5vcm1zO1xcbiAgICAgICAgdGhpcy50ZXh0dXJlcyA9IHVucGFja2VkLnRleHR1cmVzO1xcbiAgICAgICAgdGhpcy52ZXJ0ZXhNYXRlcmlhbEluZGljZXMgPSB1bnBhY2tlZC5tYXRlcmlhbEluZGljZXM7XFxuICAgICAgICB0aGlzLmluZGljZXMgPSB1bnBhY2tlZC5pbmRpY2VzW2N1cnJlbnRPYmplY3RCeU1hdGVyaWFsSW5kZXhdO1xcbiAgICAgICAgdGhpcy5pbmRpY2VzUGVyTWF0ZXJpYWwgPSB1bnBhY2tlZC5pbmRpY2VzO1xcbiAgICAgICAgdGhpcy5tYXRlcmlhbE5hbWVzID0gbWF0ZXJpYWxOYW1lc0J5SW5kZXg7XFxuICAgICAgICB0aGlzLm1hdGVyaWFsSW5kaWNlcyA9IG1hdGVyaWFsSW5kaWNlc0J5TmFtZTtcXG4gICAgICAgIHRoaXMubWF0ZXJpYWxzQnlJbmRleCA9IHt9O1xcbiAgICAgICAgaWYgKG9wdGlvbnMuY2FsY1RhbmdlbnRzQW5kQml0YW5nZW50cykge1xcbiAgICAgICAgICAgIHRoaXMuY2FsY3VsYXRlVGFuZ2VudHNBbmRCaXRhbmdlbnRzKCk7XFxuICAgICAgICB9XFxuICAgIH1cXG4gICAgLyoqXFxuICAgICAqIENhbGN1bGF0ZXMgdGhlIHRhbmdlbnRzIGFuZCBiaXRhbmdlbnRzIG9mIHRoZSBtZXNoIHRoYXQgZm9ybXMgYW4gb3J0aG9nb25hbCBiYXNpcyB0b2dldGhlciB3aXRoIHRoZVxcbiAgICAgKiBub3JtYWwgaW4gdGhlIGRpcmVjdGlvbiBvZiB0aGUgdGV4dHVyZSBjb29yZGluYXRlcy4gVGhlc2UgYXJlIHVzZWZ1bCBmb3Igc2V0dGluZyB1cCB0aGUgVEJOIG1hdHJpeFxcbiAgICAgKiB3aGVuIGRpc3RvcnRpbmcgdGhlIG5vcm1hbHMgdGhyb3VnaCBub3JtYWwgbWFwcy5cXG4gICAgICogTWV0aG9kIGRlcml2ZWQgZnJvbTogaHR0cDovL3d3dy5vcGVuZ2wtdHV0b3JpYWwub3JnL2ludGVybWVkaWF0ZS10dXRvcmlhbHMvdHV0b3JpYWwtMTMtbm9ybWFsLW1hcHBpbmcvXFxuICAgICAqXFxuICAgICAqIFRoaXMgbWV0aG9kIHJlcXVpcmVzIHRoZSBub3JtYWxzIGFuZCB0ZXh0dXJlIGNvb3JkaW5hdGVzIHRvIGJlIHBhcnNlZCBhbmQgc2V0IHVwIGNvcnJlY3RseS5cXG4gICAgICogQWRkcyB0aGUgdGFuZ2VudHMgYW5kIGJpdGFuZ2VudHMgYXMgbWVtYmVycyBvZiB0aGUgY2xhc3MgaW5zdGFuY2UuXFxuICAgICAqL1xcbiAgICBjYWxjdWxhdGVUYW5nZW50c0FuZEJpdGFuZ2VudHMoKSB7XFxuICAgICAgICBjb25zb2xlLmFzc2VydCghISh0aGlzLnZlcnRpY2VzICYmXFxuICAgICAgICAgICAgdGhpcy52ZXJ0aWNlcy5sZW5ndGggJiZcXG4gICAgICAgICAgICB0aGlzLnZlcnRleE5vcm1hbHMgJiZcXG4gICAgICAgICAgICB0aGlzLnZlcnRleE5vcm1hbHMubGVuZ3RoICYmXFxuICAgICAgICAgICAgdGhpcy50ZXh0dXJlcyAmJlxcbiAgICAgICAgICAgIHRoaXMudGV4dHVyZXMubGVuZ3RoKSwgXCJNaXNzaW5nIGF0dHJpYnV0ZXMgZm9yIGNhbGN1bGF0aW5nIHRhbmdlbnRzIGFuZCBiaXRhbmdlbnRzXCIpO1xcbiAgICAgICAgY29uc3QgdW5wYWNrZWQgPSB7XFxuICAgICAgICAgICAgdGFuZ2VudHM6IFsuLi5uZXcgQXJyYXkodGhpcy52ZXJ0aWNlcy5sZW5ndGgpXS5tYXAoXyA9PiAwKSxcXG4gICAgICAgICAgICBiaXRhbmdlbnRzOiBbLi4ubmV3IEFycmF5KHRoaXMudmVydGljZXMubGVuZ3RoKV0ubWFwKF8gPT4gMCksXFxuICAgICAgICB9O1xcbiAgICAgICAgLy8gTG9vcCB0aHJvdWdoIGFsbCBmYWNlcyBpbiB0aGUgd2hvbGUgbWVzaFxcbiAgICAgICAgY29uc3QgaW5kaWNlcyA9IHRoaXMuaW5kaWNlcztcXG4gICAgICAgIGNvbnN0IHZlcnRpY2VzID0gdGhpcy52ZXJ0aWNlcztcXG4gICAgICAgIGNvbnN0IG5vcm1hbHMgPSB0aGlzLnZlcnRleE5vcm1hbHM7XFxuICAgICAgICBjb25zdCB1dnMgPSB0aGlzLnRleHR1cmVzO1xcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbmRpY2VzLmxlbmd0aDsgaSArPSAzKSB7XFxuICAgICAgICAgICAgY29uc3QgaTAgPSBpbmRpY2VzW2kgKyAwXTtcXG4gICAgICAgICAgICBjb25zdCBpMSA9IGluZGljZXNbaSArIDFdO1xcbiAgICAgICAgICAgIGNvbnN0IGkyID0gaW5kaWNlc1tpICsgMl07XFxuICAgICAgICAgICAgY29uc3QgeF92MCA9IHZlcnRpY2VzW2kwICogMyArIDBdO1xcbiAgICAgICAgICAgIGNvbnN0IHlfdjAgPSB2ZXJ0aWNlc1tpMCAqIDMgKyAxXTtcXG4gICAgICAgICAgICBjb25zdCB6X3YwID0gdmVydGljZXNbaTAgKiAzICsgMl07XFxuICAgICAgICAgICAgY29uc3QgeF91djAgPSB1dnNbaTAgKiAyICsgMF07XFxuICAgICAgICAgICAgY29uc3QgeV91djAgPSB1dnNbaTAgKiAyICsgMV07XFxuICAgICAgICAgICAgY29uc3QgeF92MSA9IHZlcnRpY2VzW2kxICogMyArIDBdO1xcbiAgICAgICAgICAgIGNvbnN0IHlfdjEgPSB2ZXJ0aWNlc1tpMSAqIDMgKyAxXTtcXG4gICAgICAgICAgICBjb25zdCB6X3YxID0gdmVydGljZXNbaTEgKiAzICsgMl07XFxuICAgICAgICAgICAgY29uc3QgeF91djEgPSB1dnNbaTEgKiAyICsgMF07XFxuICAgICAgICAgICAgY29uc3QgeV91djEgPSB1dnNbaTEgKiAyICsgMV07XFxuICAgICAgICAgICAgY29uc3QgeF92MiA9IHZlcnRpY2VzW2kyICogMyArIDBdO1xcbiAgICAgICAgICAgIGNvbnN0IHlfdjIgPSB2ZXJ0aWNlc1tpMiAqIDMgKyAxXTtcXG4gICAgICAgICAgICBjb25zdCB6X3YyID0gdmVydGljZXNbaTIgKiAzICsgMl07XFxuICAgICAgICAgICAgY29uc3QgeF91djIgPSB1dnNbaTIgKiAyICsgMF07XFxuICAgICAgICAgICAgY29uc3QgeV91djIgPSB1dnNbaTIgKiAyICsgMV07XFxuICAgICAgICAgICAgY29uc3QgeF9kZWx0YVBvczEgPSB4X3YxIC0geF92MDtcXG4gICAgICAgICAgICBjb25zdCB5X2RlbHRhUG9zMSA9IHlfdjEgLSB5X3YwO1xcbiAgICAgICAgICAgIGNvbnN0IHpfZGVsdGFQb3MxID0gel92MSAtIHpfdjA7XFxuICAgICAgICAgICAgY29uc3QgeF9kZWx0YVBvczIgPSB4X3YyIC0geF92MDtcXG4gICAgICAgICAgICBjb25zdCB5X2RlbHRhUG9zMiA9IHlfdjIgLSB5X3YwO1xcbiAgICAgICAgICAgIGNvbnN0IHpfZGVsdGFQb3MyID0gel92MiAtIHpfdjA7XFxuICAgICAgICAgICAgY29uc3QgeF91dkRlbHRhUG9zMSA9IHhfdXYxIC0geF91djA7XFxuICAgICAgICAgICAgY29uc3QgeV91dkRlbHRhUG9zMSA9IHlfdXYxIC0geV91djA7XFxuICAgICAgICAgICAgY29uc3QgeF91dkRlbHRhUG9zMiA9IHhfdXYyIC0geF91djA7XFxuICAgICAgICAgICAgY29uc3QgeV91dkRlbHRhUG9zMiA9IHlfdXYyIC0geV91djA7XFxuICAgICAgICAgICAgY29uc3QgckludiA9IHhfdXZEZWx0YVBvczEgKiB5X3V2RGVsdGFQb3MyIC0geV91dkRlbHRhUG9zMSAqIHhfdXZEZWx0YVBvczI7XFxuICAgICAgICAgICAgY29uc3QgciA9IDEuMCAvIE1hdGguYWJzKHJJbnYgPCAwLjAwMDEgPyAxLjAgOiBySW52KTtcXG4gICAgICAgICAgICAvLyBUYW5nZW50XFxuICAgICAgICAgICAgY29uc3QgeF90YW5nZW50ID0gKHhfZGVsdGFQb3MxICogeV91dkRlbHRhUG9zMiAtIHhfZGVsdGFQb3MyICogeV91dkRlbHRhUG9zMSkgKiByO1xcbiAgICAgICAgICAgIGNvbnN0IHlfdGFuZ2VudCA9ICh5X2RlbHRhUG9zMSAqIHlfdXZEZWx0YVBvczIgLSB5X2RlbHRhUG9zMiAqIHlfdXZEZWx0YVBvczEpICogcjtcXG4gICAgICAgICAgICBjb25zdCB6X3RhbmdlbnQgPSAoel9kZWx0YVBvczEgKiB5X3V2RGVsdGFQb3MyIC0gel9kZWx0YVBvczIgKiB5X3V2RGVsdGFQb3MxKSAqIHI7XFxuICAgICAgICAgICAgLy8gQml0YW5nZW50XFxuICAgICAgICAgICAgY29uc3QgeF9iaXRhbmdlbnQgPSAoeF9kZWx0YVBvczIgKiB4X3V2RGVsdGFQb3MxIC0geF9kZWx0YVBvczEgKiB4X3V2RGVsdGFQb3MyKSAqIHI7XFxuICAgICAgICAgICAgY29uc3QgeV9iaXRhbmdlbnQgPSAoeV9kZWx0YVBvczIgKiB4X3V2RGVsdGFQb3MxIC0geV9kZWx0YVBvczEgKiB4X3V2RGVsdGFQb3MyKSAqIHI7XFxuICAgICAgICAgICAgY29uc3Qgel9iaXRhbmdlbnQgPSAoel9kZWx0YVBvczIgKiB4X3V2RGVsdGFQb3MxIC0gel9kZWx0YVBvczEgKiB4X3V2RGVsdGFQb3MyKSAqIHI7XFxuICAgICAgICAgICAgLy8gR3JhbS1TY2htaWR0IG9ydGhvZ29uYWxpemVcXG4gICAgICAgICAgICAvL3QgPSBnbG06Om5vcm1hbGl6ZSh0IC0gbiAqIGdsbTo6IGRvdChuLCB0KSk7XFxuICAgICAgICAgICAgY29uc3QgeF9uMCA9IG5vcm1hbHNbaTAgKiAzICsgMF07XFxuICAgICAgICAgICAgY29uc3QgeV9uMCA9IG5vcm1hbHNbaTAgKiAzICsgMV07XFxuICAgICAgICAgICAgY29uc3Qgel9uMCA9IG5vcm1hbHNbaTAgKiAzICsgMl07XFxuICAgICAgICAgICAgY29uc3QgeF9uMSA9IG5vcm1hbHNbaTEgKiAzICsgMF07XFxuICAgICAgICAgICAgY29uc3QgeV9uMSA9IG5vcm1hbHNbaTEgKiAzICsgMV07XFxuICAgICAgICAgICAgY29uc3Qgel9uMSA9IG5vcm1hbHNbaTEgKiAzICsgMl07XFxuICAgICAgICAgICAgY29uc3QgeF9uMiA9IG5vcm1hbHNbaTIgKiAzICsgMF07XFxuICAgICAgICAgICAgY29uc3QgeV9uMiA9IG5vcm1hbHNbaTIgKiAzICsgMV07XFxuICAgICAgICAgICAgY29uc3Qgel9uMiA9IG5vcm1hbHNbaTIgKiAzICsgMl07XFxuICAgICAgICAgICAgLy8gVGFuZ2VudFxcbiAgICAgICAgICAgIGNvbnN0IG4wX2RvdF90ID0geF90YW5nZW50ICogeF9uMCArIHlfdGFuZ2VudCAqIHlfbjAgKyB6X3RhbmdlbnQgKiB6X24wO1xcbiAgICAgICAgICAgIGNvbnN0IG4xX2RvdF90ID0geF90YW5nZW50ICogeF9uMSArIHlfdGFuZ2VudCAqIHlfbjEgKyB6X3RhbmdlbnQgKiB6X24xO1xcbiAgICAgICAgICAgIGNvbnN0IG4yX2RvdF90ID0geF90YW5nZW50ICogeF9uMiArIHlfdGFuZ2VudCAqIHlfbjIgKyB6X3RhbmdlbnQgKiB6X24yO1xcbiAgICAgICAgICAgIGNvbnN0IHhfcmVzVGFuZ2VudDAgPSB4X3RhbmdlbnQgLSB4X24wICogbjBfZG90X3Q7XFxuICAgICAgICAgICAgY29uc3QgeV9yZXNUYW5nZW50MCA9IHlfdGFuZ2VudCAtIHlfbjAgKiBuMF9kb3RfdDtcXG4gICAgICAgICAgICBjb25zdCB6X3Jlc1RhbmdlbnQwID0gel90YW5nZW50IC0gel9uMCAqIG4wX2RvdF90O1xcbiAgICAgICAgICAgIGNvbnN0IHhfcmVzVGFuZ2VudDEgPSB4X3RhbmdlbnQgLSB4X24xICogbjFfZG90X3Q7XFxuICAgICAgICAgICAgY29uc3QgeV9yZXNUYW5nZW50MSA9IHlfdGFuZ2VudCAtIHlfbjEgKiBuMV9kb3RfdDtcXG4gICAgICAgICAgICBjb25zdCB6X3Jlc1RhbmdlbnQxID0gel90YW5nZW50IC0gel9uMSAqIG4xX2RvdF90O1xcbiAgICAgICAgICAgIGNvbnN0IHhfcmVzVGFuZ2VudDIgPSB4X3RhbmdlbnQgLSB4X24yICogbjJfZG90X3Q7XFxuICAgICAgICAgICAgY29uc3QgeV9yZXNUYW5nZW50MiA9IHlfdGFuZ2VudCAtIHlfbjIgKiBuMl9kb3RfdDtcXG4gICAgICAgICAgICBjb25zdCB6X3Jlc1RhbmdlbnQyID0gel90YW5nZW50IC0gel9uMiAqIG4yX2RvdF90O1xcbiAgICAgICAgICAgIGNvbnN0IG1hZ1RhbmdlbnQwID0gTWF0aC5zcXJ0KHhfcmVzVGFuZ2VudDAgKiB4X3Jlc1RhbmdlbnQwICsgeV9yZXNUYW5nZW50MCAqIHlfcmVzVGFuZ2VudDAgKyB6X3Jlc1RhbmdlbnQwICogel9yZXNUYW5nZW50MCk7XFxuICAgICAgICAgICAgY29uc3QgbWFnVGFuZ2VudDEgPSBNYXRoLnNxcnQoeF9yZXNUYW5nZW50MSAqIHhfcmVzVGFuZ2VudDEgKyB5X3Jlc1RhbmdlbnQxICogeV9yZXNUYW5nZW50MSArIHpfcmVzVGFuZ2VudDEgKiB6X3Jlc1RhbmdlbnQxKTtcXG4gICAgICAgICAgICBjb25zdCBtYWdUYW5nZW50MiA9IE1hdGguc3FydCh4X3Jlc1RhbmdlbnQyICogeF9yZXNUYW5nZW50MiArIHlfcmVzVGFuZ2VudDIgKiB5X3Jlc1RhbmdlbnQyICsgel9yZXNUYW5nZW50MiAqIHpfcmVzVGFuZ2VudDIpO1xcbiAgICAgICAgICAgIC8vIEJpdGFuZ2VudFxcbiAgICAgICAgICAgIGNvbnN0IG4wX2RvdF9idCA9IHhfYml0YW5nZW50ICogeF9uMCArIHlfYml0YW5nZW50ICogeV9uMCArIHpfYml0YW5nZW50ICogel9uMDtcXG4gICAgICAgICAgICBjb25zdCBuMV9kb3RfYnQgPSB4X2JpdGFuZ2VudCAqIHhfbjEgKyB5X2JpdGFuZ2VudCAqIHlfbjEgKyB6X2JpdGFuZ2VudCAqIHpfbjE7XFxuICAgICAgICAgICAgY29uc3QgbjJfZG90X2J0ID0geF9iaXRhbmdlbnQgKiB4X24yICsgeV9iaXRhbmdlbnQgKiB5X24yICsgel9iaXRhbmdlbnQgKiB6X24yO1xcbiAgICAgICAgICAgIGNvbnN0IHhfcmVzQml0YW5nZW50MCA9IHhfYml0YW5nZW50IC0geF9uMCAqIG4wX2RvdF9idDtcXG4gICAgICAgICAgICBjb25zdCB5X3Jlc0JpdGFuZ2VudDAgPSB5X2JpdGFuZ2VudCAtIHlfbjAgKiBuMF9kb3RfYnQ7XFxuICAgICAgICAgICAgY29uc3Qgel9yZXNCaXRhbmdlbnQwID0gel9iaXRhbmdlbnQgLSB6X24wICogbjBfZG90X2J0O1xcbiAgICAgICAgICAgIGNvbnN0IHhfcmVzQml0YW5nZW50MSA9IHhfYml0YW5nZW50IC0geF9uMSAqIG4xX2RvdF9idDtcXG4gICAgICAgICAgICBjb25zdCB5X3Jlc0JpdGFuZ2VudDEgPSB5X2JpdGFuZ2VudCAtIHlfbjEgKiBuMV9kb3RfYnQ7XFxuICAgICAgICAgICAgY29uc3Qgel9yZXNCaXRhbmdlbnQxID0gel9iaXRhbmdlbnQgLSB6X24xICogbjFfZG90X2J0O1xcbiAgICAgICAgICAgIGNvbnN0IHhfcmVzQml0YW5nZW50MiA9IHhfYml0YW5nZW50IC0geF9uMiAqIG4yX2RvdF9idDtcXG4gICAgICAgICAgICBjb25zdCB5X3Jlc0JpdGFuZ2VudDIgPSB5X2JpdGFuZ2VudCAtIHlfbjIgKiBuMl9kb3RfYnQ7XFxuICAgICAgICAgICAgY29uc3Qgel9yZXNCaXRhbmdlbnQyID0gel9iaXRhbmdlbnQgLSB6X24yICogbjJfZG90X2J0O1xcbiAgICAgICAgICAgIGNvbnN0IG1hZ0JpdGFuZ2VudDAgPSBNYXRoLnNxcnQoeF9yZXNCaXRhbmdlbnQwICogeF9yZXNCaXRhbmdlbnQwICtcXG4gICAgICAgICAgICAgICAgeV9yZXNCaXRhbmdlbnQwICogeV9yZXNCaXRhbmdlbnQwICtcXG4gICAgICAgICAgICAgICAgel9yZXNCaXRhbmdlbnQwICogel9yZXNCaXRhbmdlbnQwKTtcXG4gICAgICAgICAgICBjb25zdCBtYWdCaXRhbmdlbnQxID0gTWF0aC5zcXJ0KHhfcmVzQml0YW5nZW50MSAqIHhfcmVzQml0YW5nZW50MSArXFxuICAgICAgICAgICAgICAgIHlfcmVzQml0YW5nZW50MSAqIHlfcmVzQml0YW5nZW50MSArXFxuICAgICAgICAgICAgICAgIHpfcmVzQml0YW5nZW50MSAqIHpfcmVzQml0YW5nZW50MSk7XFxuICAgICAgICAgICAgY29uc3QgbWFnQml0YW5nZW50MiA9IE1hdGguc3FydCh4X3Jlc0JpdGFuZ2VudDIgKiB4X3Jlc0JpdGFuZ2VudDIgK1xcbiAgICAgICAgICAgICAgICB5X3Jlc0JpdGFuZ2VudDIgKiB5X3Jlc0JpdGFuZ2VudDIgK1xcbiAgICAgICAgICAgICAgICB6X3Jlc0JpdGFuZ2VudDIgKiB6X3Jlc0JpdGFuZ2VudDIpO1xcbiAgICAgICAgICAgIHVucGFja2VkLnRhbmdlbnRzW2kwICogMyArIDBdICs9IHhfcmVzVGFuZ2VudDAgLyBtYWdUYW5nZW50MDtcXG4gICAgICAgICAgICB1bnBhY2tlZC50YW5nZW50c1tpMCAqIDMgKyAxXSArPSB5X3Jlc1RhbmdlbnQwIC8gbWFnVGFuZ2VudDA7XFxuICAgICAgICAgICAgdW5wYWNrZWQudGFuZ2VudHNbaTAgKiAzICsgMl0gKz0gel9yZXNUYW5nZW50MCAvIG1hZ1RhbmdlbnQwO1xcbiAgICAgICAgICAgIHVucGFja2VkLnRhbmdlbnRzW2kxICogMyArIDBdICs9IHhfcmVzVGFuZ2VudDEgLyBtYWdUYW5nZW50MTtcXG4gICAgICAgICAgICB1bnBhY2tlZC50YW5nZW50c1tpMSAqIDMgKyAxXSArPSB5X3Jlc1RhbmdlbnQxIC8gbWFnVGFuZ2VudDE7XFxuICAgICAgICAgICAgdW5wYWNrZWQudGFuZ2VudHNbaTEgKiAzICsgMl0gKz0gel9yZXNUYW5nZW50MSAvIG1hZ1RhbmdlbnQxO1xcbiAgICAgICAgICAgIHVucGFja2VkLnRhbmdlbnRzW2kyICogMyArIDBdICs9IHhfcmVzVGFuZ2VudDIgLyBtYWdUYW5nZW50MjtcXG4gICAgICAgICAgICB1bnBhY2tlZC50YW5nZW50c1tpMiAqIDMgKyAxXSArPSB5X3Jlc1RhbmdlbnQyIC8gbWFnVGFuZ2VudDI7XFxuICAgICAgICAgICAgdW5wYWNrZWQudGFuZ2VudHNbaTIgKiAzICsgMl0gKz0gel9yZXNUYW5nZW50MiAvIG1hZ1RhbmdlbnQyO1xcbiAgICAgICAgICAgIHVucGFja2VkLmJpdGFuZ2VudHNbaTAgKiAzICsgMF0gKz0geF9yZXNCaXRhbmdlbnQwIC8gbWFnQml0YW5nZW50MDtcXG4gICAgICAgICAgICB1bnBhY2tlZC5iaXRhbmdlbnRzW2kwICogMyArIDFdICs9IHlfcmVzQml0YW5nZW50MCAvIG1hZ0JpdGFuZ2VudDA7XFxuICAgICAgICAgICAgdW5wYWNrZWQuYml0YW5nZW50c1tpMCAqIDMgKyAyXSArPSB6X3Jlc0JpdGFuZ2VudDAgLyBtYWdCaXRhbmdlbnQwO1xcbiAgICAgICAgICAgIHVucGFja2VkLmJpdGFuZ2VudHNbaTEgKiAzICsgMF0gKz0geF9yZXNCaXRhbmdlbnQxIC8gbWFnQml0YW5nZW50MTtcXG4gICAgICAgICAgICB1bnBhY2tlZC5iaXRhbmdlbnRzW2kxICogMyArIDFdICs9IHlfcmVzQml0YW5nZW50MSAvIG1hZ0JpdGFuZ2VudDE7XFxuICAgICAgICAgICAgdW5wYWNrZWQuYml0YW5nZW50c1tpMSAqIDMgKyAyXSArPSB6X3Jlc0JpdGFuZ2VudDEgLyBtYWdCaXRhbmdlbnQxO1xcbiAgICAgICAgICAgIHVucGFja2VkLmJpdGFuZ2VudHNbaTIgKiAzICsgMF0gKz0geF9yZXNCaXRhbmdlbnQyIC8gbWFnQml0YW5nZW50MjtcXG4gICAgICAgICAgICB1bnBhY2tlZC5iaXRhbmdlbnRzW2kyICogMyArIDFdICs9IHlfcmVzQml0YW5nZW50MiAvIG1hZ0JpdGFuZ2VudDI7XFxuICAgICAgICAgICAgdW5wYWNrZWQuYml0YW5nZW50c1tpMiAqIDMgKyAyXSArPSB6X3Jlc0JpdGFuZ2VudDIgLyBtYWdCaXRhbmdlbnQyO1xcbiAgICAgICAgICAgIC8vIFRPRE86IGNoZWNrIGhhbmRlZG5lc3NcXG4gICAgICAgIH1cXG4gICAgICAgIHRoaXMudGFuZ2VudHMgPSB1bnBhY2tlZC50YW5nZW50cztcXG4gICAgICAgIHRoaXMuYml0YW5nZW50cyA9IHVucGFja2VkLmJpdGFuZ2VudHM7XFxuICAgIH1cXG4gICAgLyoqXFxuICAgICAqIEBwYXJhbSBsYXlvdXQgLSBBIHtAbGluayBMYXlvdXR9IG9iamVjdCB0aGF0IGRlc2NyaWJlcyB0aGVcXG4gICAgICogZGVzaXJlZCBtZW1vcnkgbGF5b3V0IG9mIHRoZSBnZW5lcmF0ZWQgYnVmZmVyXFxuICAgICAqIEByZXR1cm4gVGhlIHBhY2tlZCBhcnJheSBpbiB0aGUgLi4uIFRPRE9cXG4gICAgICovXFxuICAgIG1ha2VCdWZmZXJEYXRhKGxheW91dCkge1xcbiAgICAgICAgY29uc3QgbnVtSXRlbXMgPSB0aGlzLnZlcnRpY2VzLmxlbmd0aCAvIDM7XFxuICAgICAgICBjb25zdCBidWZmZXIgPSBuZXcgQXJyYXlCdWZmZXIobGF5b3V0LnN0cmlkZSAqIG51bUl0ZW1zKTtcXG4gICAgICAgIGJ1ZmZlci5udW1JdGVtcyA9IG51bUl0ZW1zO1xcbiAgICAgICAgY29uc3QgZGF0YVZpZXcgPSBuZXcgRGF0YVZpZXcoYnVmZmVyKTtcXG4gICAgICAgIGZvciAobGV0IGkgPSAwLCB2ZXJ0ZXhPZmZzZXQgPSAwOyBpIDwgbnVtSXRlbXM7IGkrKykge1xcbiAgICAgICAgICAgIHZlcnRleE9mZnNldCA9IGkgKiBsYXlvdXQuc3RyaWRlO1xcbiAgICAgICAgICAgIC8vIGNvcHkgaW4gdGhlIHZlcnRleCBkYXRhIGluIHRoZSBvcmRlciBhbmQgZm9ybWF0IGdpdmVuIGJ5IHRoZVxcbiAgICAgICAgICAgIC8vIGxheW91dCBwYXJhbVxcbiAgICAgICAgICAgIGZvciAoY29uc3QgYXR0cmlidXRlIG9mIGxheW91dC5hdHRyaWJ1dGVzKSB7XFxuICAgICAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IHZlcnRleE9mZnNldCArIGxheW91dC5hdHRyaWJ1dGVNYXBbYXR0cmlidXRlLmtleV0ub2Zmc2V0O1xcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGF0dHJpYnV0ZS5rZXkpIHtcXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgX2xheW91dF9fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fW1wiTGF5b3V0XCJdLlBPU0lUSU9OLmtleTpcXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhVmlldy5zZXRGbG9hdDMyKG9mZnNldCwgdGhpcy52ZXJ0aWNlc1tpICogM10sIHRydWUpO1xcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGFWaWV3LnNldEZsb2F0MzIob2Zmc2V0ICsgNCwgdGhpcy52ZXJ0aWNlc1tpICogMyArIDFdLCB0cnVlKTtcXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhVmlldy5zZXRGbG9hdDMyKG9mZnNldCArIDgsIHRoaXMudmVydGljZXNbaSAqIDMgKyAyXSwgdHJ1ZSk7XFxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XFxuICAgICAgICAgICAgICAgICAgICBjYXNlIF9sYXlvdXRfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfX1tcIkxheW91dFwiXS5VVi5rZXk6XFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVZpZXcuc2V0RmxvYXQzMihvZmZzZXQsIHRoaXMudGV4dHVyZXNbaSAqIDJdLCB0cnVlKTtcXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhVmlldy5zZXRGbG9hdDMyKG9mZnNldCArIDQsIHRoaXMudGV4dHVyZXNbaSAqIDIgKyAxXSwgdHJ1ZSk7XFxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XFxuICAgICAgICAgICAgICAgICAgICBjYXNlIF9sYXlvdXRfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfX1tcIkxheW91dFwiXS5OT1JNQUwua2V5OlxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGFWaWV3LnNldEZsb2F0MzIob2Zmc2V0LCB0aGlzLnZlcnRleE5vcm1hbHNbaSAqIDNdLCB0cnVlKTtcXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhVmlldy5zZXRGbG9hdDMyKG9mZnNldCArIDQsIHRoaXMudmVydGV4Tm9ybWFsc1tpICogMyArIDFdLCB0cnVlKTtcXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhVmlldy5zZXRGbG9hdDMyKG9mZnNldCArIDgsIHRoaXMudmVydGV4Tm9ybWFsc1tpICogMyArIDJdLCB0cnVlKTtcXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgX2xheW91dF9fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fW1wiTGF5b3V0XCJdLk1BVEVSSUFMX0lOREVYLmtleTpcXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhVmlldy5zZXRJbnQxNihvZmZzZXQsIHRoaXMudmVydGV4TWF0ZXJpYWxJbmRpY2VzW2ldLCB0cnVlKTtcXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgX2xheW91dF9fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fW1wiTGF5b3V0XCJdLkFNQklFTlQua2V5OiB7XFxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbWF0ZXJpYWxJbmRleCA9IHRoaXMudmVydGV4TWF0ZXJpYWxJbmRpY2VzW2ldO1xcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1hdGVyaWFsID0gdGhpcy5tYXRlcmlhbHNCeUluZGV4W21hdGVyaWFsSW5kZXhdO1xcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghbWF0ZXJpYWwpIHtcXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFxcJ01hdGVyaWFsIFwiXFwnICtcXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubWF0ZXJpYWxOYW1lc1ttYXRlcmlhbEluZGV4XSArXFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXCdcIiBub3QgZm91bmQgaW4gbWVzaC4gRGlkIHlvdSBmb3JnZXQgdG8gY2FsbCBhZGRNYXRlcmlhbExpYnJhcnkoLi4uKT9cIlxcJyk7XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhVmlldy5zZXRGbG9hdDMyKG9mZnNldCwgbWF0ZXJpYWwuYW1iaWVudFswXSwgdHJ1ZSk7XFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVZpZXcuc2V0RmxvYXQzMihvZmZzZXQgKyA0LCBtYXRlcmlhbC5hbWJpZW50WzFdLCB0cnVlKTtcXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhVmlldy5zZXRGbG9hdDMyKG9mZnNldCArIDgsIG1hdGVyaWFsLmFtYmllbnRbMl0sIHRydWUpO1xcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xcbiAgICAgICAgICAgICAgICAgICAgfVxcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBfbGF5b3V0X19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX19bXCJMYXlvdXRcIl0uRElGRlVTRS5rZXk6IHtcXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtYXRlcmlhbEluZGV4ID0gdGhpcy52ZXJ0ZXhNYXRlcmlhbEluZGljZXNbaV07XFxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbWF0ZXJpYWwgPSB0aGlzLm1hdGVyaWFsc0J5SW5kZXhbbWF0ZXJpYWxJbmRleF07XFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFtYXRlcmlhbCkge1xcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXFwnTWF0ZXJpYWwgXCJcXCcgK1xcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5tYXRlcmlhbE5hbWVzW21hdGVyaWFsSW5kZXhdICtcXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxcJ1wiIG5vdCBmb3VuZCBpbiBtZXNoLiBEaWQgeW91IGZvcmdldCB0byBjYWxsIGFkZE1hdGVyaWFsTGlicmFyeSguLi4pP1wiXFwnKTtcXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGFWaWV3LnNldEZsb2F0MzIob2Zmc2V0LCBtYXRlcmlhbC5kaWZmdXNlWzBdLCB0cnVlKTtcXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhVmlldy5zZXRGbG9hdDMyKG9mZnNldCArIDQsIG1hdGVyaWFsLmRpZmZ1c2VbMV0sIHRydWUpO1xcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGFWaWV3LnNldEZsb2F0MzIob2Zmc2V0ICsgOCwgbWF0ZXJpYWwuZGlmZnVzZVsyXSwgdHJ1ZSk7XFxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XFxuICAgICAgICAgICAgICAgICAgICB9XFxuICAgICAgICAgICAgICAgICAgICBjYXNlIF9sYXlvdXRfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfX1tcIkxheW91dFwiXS5TUEVDVUxBUi5rZXk6IHtcXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtYXRlcmlhbEluZGV4ID0gdGhpcy52ZXJ0ZXhNYXRlcmlhbEluZGljZXNbaV07XFxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbWF0ZXJpYWwgPSB0aGlzLm1hdGVyaWFsc0J5SW5kZXhbbWF0ZXJpYWxJbmRleF07XFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFtYXRlcmlhbCkge1xcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXFwnTWF0ZXJpYWwgXCJcXCcgK1xcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5tYXRlcmlhbE5hbWVzW21hdGVyaWFsSW5kZXhdICtcXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxcJ1wiIG5vdCBmb3VuZCBpbiBtZXNoLiBEaWQgeW91IGZvcmdldCB0byBjYWxsIGFkZE1hdGVyaWFsTGlicmFyeSguLi4pP1wiXFwnKTtcXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGFWaWV3LnNldEZsb2F0MzIob2Zmc2V0LCBtYXRlcmlhbC5zcGVjdWxhclswXSwgdHJ1ZSk7XFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVZpZXcuc2V0RmxvYXQzMihvZmZzZXQgKyA0LCBtYXRlcmlhbC5zcGVjdWxhclsxXSwgdHJ1ZSk7XFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVZpZXcuc2V0RmxvYXQzMihvZmZzZXQgKyA4LCBtYXRlcmlhbC5zcGVjdWxhclsyXSwgdHJ1ZSk7XFxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XFxuICAgICAgICAgICAgICAgICAgICB9XFxuICAgICAgICAgICAgICAgICAgICBjYXNlIF9sYXlvdXRfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfX1tcIkxheW91dFwiXS5TUEVDVUxBUl9FWFBPTkVOVC5rZXk6IHtcXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtYXRlcmlhbEluZGV4ID0gdGhpcy52ZXJ0ZXhNYXRlcmlhbEluZGljZXNbaV07XFxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbWF0ZXJpYWwgPSB0aGlzLm1hdGVyaWFsc0J5SW5kZXhbbWF0ZXJpYWxJbmRleF07XFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFtYXRlcmlhbCkge1xcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXFwnTWF0ZXJpYWwgXCJcXCcgK1xcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5tYXRlcmlhbE5hbWVzW21hdGVyaWFsSW5kZXhdICtcXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxcJ1wiIG5vdCBmb3VuZCBpbiBtZXNoLiBEaWQgeW91IGZvcmdldCB0byBjYWxsIGFkZE1hdGVyaWFsTGlicmFyeSguLi4pP1wiXFwnKTtcXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGFWaWV3LnNldEZsb2F0MzIob2Zmc2V0LCBtYXRlcmlhbC5zcGVjdWxhckV4cG9uZW50LCB0cnVlKTtcXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcXG4gICAgICAgICAgICAgICAgICAgIH1cXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgX2xheW91dF9fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fW1wiTGF5b3V0XCJdLkVNSVNTSVZFLmtleToge1xcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1hdGVyaWFsSW5kZXggPSB0aGlzLnZlcnRleE1hdGVyaWFsSW5kaWNlc1tpXTtcXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtYXRlcmlhbCA9IHRoaXMubWF0ZXJpYWxzQnlJbmRleFttYXRlcmlhbEluZGV4XTtcXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIW1hdGVyaWFsKSB7XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcXCdNYXRlcmlhbCBcIlxcJyArXFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm1hdGVyaWFsTmFtZXNbbWF0ZXJpYWxJbmRleF0gK1xcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFwnXCIgbm90IGZvdW5kIGluIG1lc2guIERpZCB5b3UgZm9yZ2V0IHRvIGNhbGwgYWRkTWF0ZXJpYWxMaWJyYXJ5KC4uLik/XCJcXCcpO1xcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcXG4gICAgICAgICAgICAgICAgICAgICAgICB9XFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVZpZXcuc2V0RmxvYXQzMihvZmZzZXQsIG1hdGVyaWFsLmVtaXNzaXZlWzBdLCB0cnVlKTtcXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhVmlldy5zZXRGbG9hdDMyKG9mZnNldCArIDQsIG1hdGVyaWFsLmVtaXNzaXZlWzFdLCB0cnVlKTtcXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhVmlldy5zZXRGbG9hdDMyKG9mZnNldCArIDgsIG1hdGVyaWFsLmVtaXNzaXZlWzJdLCB0cnVlKTtcXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcXG4gICAgICAgICAgICAgICAgICAgIH1cXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgX2xheW91dF9fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fW1wiTGF5b3V0XCJdLlRSQU5TTUlTU0lPTl9GSUxURVIua2V5OiB7XFxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbWF0ZXJpYWxJbmRleCA9IHRoaXMudmVydGV4TWF0ZXJpYWxJbmRpY2VzW2ldO1xcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1hdGVyaWFsID0gdGhpcy5tYXRlcmlhbHNCeUluZGV4W21hdGVyaWFsSW5kZXhdO1xcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghbWF0ZXJpYWwpIHtcXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFxcJ01hdGVyaWFsIFwiXFwnICtcXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubWF0ZXJpYWxOYW1lc1ttYXRlcmlhbEluZGV4XSArXFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXCdcIiBub3QgZm91bmQgaW4gbWVzaC4gRGlkIHlvdSBmb3JnZXQgdG8gY2FsbCBhZGRNYXRlcmlhbExpYnJhcnkoLi4uKT9cIlxcJyk7XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhVmlldy5zZXRGbG9hdDMyKG9mZnNldCwgbWF0ZXJpYWwudHJhbnNtaXNzaW9uRmlsdGVyWzBdLCB0cnVlKTtcXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhVmlldy5zZXRGbG9hdDMyKG9mZnNldCArIDQsIG1hdGVyaWFsLnRyYW5zbWlzc2lvbkZpbHRlclsxXSwgdHJ1ZSk7XFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVZpZXcuc2V0RmxvYXQzMihvZmZzZXQgKyA4LCBtYXRlcmlhbC50cmFuc21pc3Npb25GaWx0ZXJbMl0sIHRydWUpO1xcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xcbiAgICAgICAgICAgICAgICAgICAgfVxcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBfbGF5b3V0X19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX19bXCJMYXlvdXRcIl0uRElTU09MVkUua2V5OiB7XFxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbWF0ZXJpYWxJbmRleCA9IHRoaXMudmVydGV4TWF0ZXJpYWxJbmRpY2VzW2ldO1xcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1hdGVyaWFsID0gdGhpcy5tYXRlcmlhbHNCeUluZGV4W21hdGVyaWFsSW5kZXhdO1xcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghbWF0ZXJpYWwpIHtcXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFxcJ01hdGVyaWFsIFwiXFwnICtcXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubWF0ZXJpYWxOYW1lc1ttYXRlcmlhbEluZGV4XSArXFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcXCdcIiBub3QgZm91bmQgaW4gbWVzaC4gRGlkIHlvdSBmb3JnZXQgdG8gY2FsbCBhZGRNYXRlcmlhbExpYnJhcnkoLi4uKT9cIlxcJyk7XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhVmlldy5zZXRGbG9hdDMyKG9mZnNldCwgbWF0ZXJpYWwuZGlzc29sdmUsIHRydWUpO1xcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xcbiAgICAgICAgICAgICAgICAgICAgfVxcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBfbGF5b3V0X19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX19bXCJMYXlvdXRcIl0uSUxMVU1JTkFUSU9OLmtleToge1xcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1hdGVyaWFsSW5kZXggPSB0aGlzLnZlcnRleE1hdGVyaWFsSW5kaWNlc1tpXTtcXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtYXRlcmlhbCA9IHRoaXMubWF0ZXJpYWxzQnlJbmRleFttYXRlcmlhbEluZGV4XTtcXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIW1hdGVyaWFsKSB7XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcXCdNYXRlcmlhbCBcIlxcJyArXFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm1hdGVyaWFsTmFtZXNbbWF0ZXJpYWxJbmRleF0gK1xcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFwnXCIgbm90IGZvdW5kIGluIG1lc2guIERpZCB5b3UgZm9yZ2V0IHRvIGNhbGwgYWRkTWF0ZXJpYWxMaWJyYXJ5KC4uLik/XCJcXCcpO1xcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcXG4gICAgICAgICAgICAgICAgICAgICAgICB9XFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVZpZXcuc2V0SW50MTYob2Zmc2V0LCBtYXRlcmlhbC5pbGx1bWluYXRpb24sIHRydWUpO1xcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xcbiAgICAgICAgICAgICAgICAgICAgfVxcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBfbGF5b3V0X19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX19bXCJMYXlvdXRcIl0uUkVGUkFDVElPTl9JTkRFWC5rZXk6IHtcXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtYXRlcmlhbEluZGV4ID0gdGhpcy52ZXJ0ZXhNYXRlcmlhbEluZGljZXNbaV07XFxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbWF0ZXJpYWwgPSB0aGlzLm1hdGVyaWFsc0J5SW5kZXhbbWF0ZXJpYWxJbmRleF07XFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFtYXRlcmlhbCkge1xcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXFwnTWF0ZXJpYWwgXCJcXCcgK1xcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5tYXRlcmlhbE5hbWVzW21hdGVyaWFsSW5kZXhdICtcXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxcJ1wiIG5vdCBmb3VuZCBpbiBtZXNoLiBEaWQgeW91IGZvcmdldCB0byBjYWxsIGFkZE1hdGVyaWFsTGlicmFyeSguLi4pP1wiXFwnKTtcXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGFWaWV3LnNldEZsb2F0MzIob2Zmc2V0LCBtYXRlcmlhbC5yZWZyYWN0aW9uSW5kZXgsIHRydWUpO1xcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xcbiAgICAgICAgICAgICAgICAgICAgfVxcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBfbGF5b3V0X19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX19bXCJMYXlvdXRcIl0uU0hBUlBORVNTLmtleToge1xcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1hdGVyaWFsSW5kZXggPSB0aGlzLnZlcnRleE1hdGVyaWFsSW5kaWNlc1tpXTtcXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtYXRlcmlhbCA9IHRoaXMubWF0ZXJpYWxzQnlJbmRleFttYXRlcmlhbEluZGV4XTtcXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIW1hdGVyaWFsKSB7XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcXCdNYXRlcmlhbCBcIlxcJyArXFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm1hdGVyaWFsTmFtZXNbbWF0ZXJpYWxJbmRleF0gK1xcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFwnXCIgbm90IGZvdW5kIGluIG1lc2guIERpZCB5b3UgZm9yZ2V0IHRvIGNhbGwgYWRkTWF0ZXJpYWxMaWJyYXJ5KC4uLik/XCJcXCcpO1xcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcXG4gICAgICAgICAgICAgICAgICAgICAgICB9XFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVZpZXcuc2V0RmxvYXQzMihvZmZzZXQsIG1hdGVyaWFsLnNoYXJwbmVzcywgdHJ1ZSk7XFxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XFxuICAgICAgICAgICAgICAgICAgICB9XFxuICAgICAgICAgICAgICAgICAgICBjYXNlIF9sYXlvdXRfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfX1tcIkxheW91dFwiXS5BTlRJX0FMSUFTSU5HLmtleToge1xcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1hdGVyaWFsSW5kZXggPSB0aGlzLnZlcnRleE1hdGVyaWFsSW5kaWNlc1tpXTtcXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtYXRlcmlhbCA9IHRoaXMubWF0ZXJpYWxzQnlJbmRleFttYXRlcmlhbEluZGV4XTtcXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIW1hdGVyaWFsKSB7XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcXCdNYXRlcmlhbCBcIlxcJyArXFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm1hdGVyaWFsTmFtZXNbbWF0ZXJpYWxJbmRleF0gK1xcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXFwnXCIgbm90IGZvdW5kIGluIG1lc2guIERpZCB5b3UgZm9yZ2V0IHRvIGNhbGwgYWRkTWF0ZXJpYWxMaWJyYXJ5KC4uLik/XCJcXCcpO1xcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcXG4gICAgICAgICAgICAgICAgICAgICAgICB9XFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVZpZXcuc2V0SW50MTYob2Zmc2V0LCBtYXRlcmlhbC5hbnRpQWxpYXNpbmcgPyAxIDogMCwgdHJ1ZSk7XFxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XFxuICAgICAgICAgICAgICAgICAgICB9XFxuICAgICAgICAgICAgICAgIH1cXG4gICAgICAgICAgICB9XFxuICAgICAgICB9XFxuICAgICAgICByZXR1cm4gYnVmZmVyO1xcbiAgICB9XFxuICAgIG1ha2VJbmRleEJ1ZmZlckRhdGEoKSB7XFxuICAgICAgICBjb25zdCBidWZmZXIgPSBuZXcgVWludDE2QXJyYXkodGhpcy5pbmRpY2VzKTtcXG4gICAgICAgIGJ1ZmZlci5udW1JdGVtcyA9IHRoaXMuaW5kaWNlcy5sZW5ndGg7XFxuICAgICAgICByZXR1cm4gYnVmZmVyO1xcbiAgICB9XFxuICAgIG1ha2VJbmRleEJ1ZmZlckRhdGFGb3JNYXRlcmlhbHMoLi4ubWF0ZXJpYWxJbmRpY2VzKSB7XFxuICAgICAgICBjb25zdCBpbmRpY2VzID0gbmV3IEFycmF5KCkuY29uY2F0KC4uLm1hdGVyaWFsSW5kaWNlcy5tYXAobXRsSWR4ID0+IHRoaXMuaW5kaWNlc1Blck1hdGVyaWFsW210bElkeF0pKTtcXG4gICAgICAgIGNvbnN0IGJ1ZmZlciA9IG5ldyBVaW50MTZBcnJheShpbmRpY2VzKTtcXG4gICAgICAgIGJ1ZmZlci5udW1JdGVtcyA9IGluZGljZXMubGVuZ3RoO1xcbiAgICAgICAgcmV0dXJuIGJ1ZmZlcjtcXG4gICAgfVxcbiAgICBhZGRNYXRlcmlhbExpYnJhcnkobXRsKSB7XFxuICAgICAgICBmb3IgKGNvbnN0IG5hbWUgaW4gbXRsLm1hdGVyaWFscykge1xcbiAgICAgICAgICAgIGlmICghKG5hbWUgaW4gdGhpcy5tYXRlcmlhbEluZGljZXMpKSB7XFxuICAgICAgICAgICAgICAgIC8vIFRoaXMgbWF0ZXJpYWwgaXMgbm90IHJlZmVyZW5jZWQgYnkgdGhlIG1lc2hcXG4gICAgICAgICAgICAgICAgY29udGludWU7XFxuICAgICAgICAgICAgfVxcbiAgICAgICAgICAgIGNvbnN0IG1hdGVyaWFsID0gbXRsLm1hdGVyaWFsc1tuYW1lXTtcXG4gICAgICAgICAgICAvLyBGaW5kIHRoZSBtYXRlcmlhbCBpbmRleCBmb3IgdGhpcyBtYXRlcmlhbFxcbiAgICAgICAgICAgIGNvbnN0IG1hdGVyaWFsSW5kZXggPSB0aGlzLm1hdGVyaWFsSW5kaWNlc1ttYXRlcmlhbC5uYW1lXTtcXG4gICAgICAgICAgICAvLyBQdXQgdGhlIG1hdGVyaWFsIGludG8gdGhlIG1hdGVyaWFsc0J5SW5kZXggb2JqZWN0IGF0IHRoZSByaWdodFxcbiAgICAgICAgICAgIC8vIHNwb3QgYXMgZGV0ZXJtaW5lZCB3aGVuIHRoZSBvYmogZmlsZSB3YXMgcGFyc2VkXFxuICAgICAgICAgICAgdGhpcy5tYXRlcmlhbHNCeUluZGV4W21hdGVyaWFsSW5kZXhdID0gbWF0ZXJpYWw7XFxuICAgICAgICB9XFxuICAgIH1cXG59XFxuZnVuY3Rpb24qIHRyaWFuZ3VsYXRlKGVsZW1lbnRzKSB7XFxuICAgIGlmIChlbGVtZW50cy5sZW5ndGggPD0gMykge1xcbiAgICAgICAgeWllbGQgZWxlbWVudHM7XFxuICAgIH1cXG4gICAgZWxzZSBpZiAoZWxlbWVudHMubGVuZ3RoID09PSA0KSB7XFxuICAgICAgICB5aWVsZCBbZWxlbWVudHNbMF0sIGVsZW1lbnRzWzFdLCBlbGVtZW50c1syXV07XFxuICAgICAgICB5aWVsZCBbZWxlbWVudHNbMl0sIGVsZW1lbnRzWzNdLCBlbGVtZW50c1swXV07XFxuICAgIH1cXG4gICAgZWxzZSB7XFxuICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA8IGVsZW1lbnRzLmxlbmd0aCAtIDE7IGkrKykge1xcbiAgICAgICAgICAgIHlpZWxkIFtlbGVtZW50c1swXSwgZWxlbWVudHNbaV0sIGVsZW1lbnRzW2kgKyAxXV07XFxuICAgICAgICB9XFxuICAgIH1cXG59XFxuXFxuXFxuLy8jIHNvdXJjZVVSTD13ZWJwYWNrOi8vT0JKLy4vc3JjL21lc2gudHM/Jyl9LFwiLi9zcmMvdXRpbHMudHNcIjpcbi8qISoqKioqKioqKioqKioqKioqKioqKiohKlxcXG4gICEqKiogLi9zcmMvdXRpbHMudHMgKioqIVxuICBcXCoqKioqKioqKioqKioqKioqKioqKiovXG4vKiEgZXhwb3J0cyBwcm92aWRlZDogZG93bmxvYWRNb2RlbHMsIGRvd25sb2FkTWVzaGVzLCBpbml0TWVzaEJ1ZmZlcnMsIGRlbGV0ZU1lc2hCdWZmZXJzICovZnVuY3Rpb24obW9kdWxlLF9fd2VicGFja19leHBvcnRzX18sX193ZWJwYWNrX3JlcXVpcmVfXyl7XCJ1c2Ugc3RyaWN0XCI7ZXZhbCgnX193ZWJwYWNrX3JlcXVpcmVfXy5yKF9fd2VicGFja19leHBvcnRzX18pO1xcbi8qIGhhcm1vbnkgZXhwb3J0IChiaW5kaW5nKSAqLyBfX3dlYnBhY2tfcmVxdWlyZV9fLmQoX193ZWJwYWNrX2V4cG9ydHNfXywgXCJkb3dubG9hZE1vZGVsc1wiLCBmdW5jdGlvbigpIHsgcmV0dXJuIGRvd25sb2FkTW9kZWxzOyB9KTtcXG4vKiBoYXJtb255IGV4cG9ydCAoYmluZGluZykgKi8gX193ZWJwYWNrX3JlcXVpcmVfXy5kKF9fd2VicGFja19leHBvcnRzX18sIFwiZG93bmxvYWRNZXNoZXNcIiwgZnVuY3Rpb24oKSB7IHJldHVybiBkb3dubG9hZE1lc2hlczsgfSk7XFxuLyogaGFybW9ueSBleHBvcnQgKGJpbmRpbmcpICovIF9fd2VicGFja19yZXF1aXJlX18uZChfX3dlYnBhY2tfZXhwb3J0c19fLCBcImluaXRNZXNoQnVmZmVyc1wiLCBmdW5jdGlvbigpIHsgcmV0dXJuIGluaXRNZXNoQnVmZmVyczsgfSk7XFxuLyogaGFybW9ueSBleHBvcnQgKGJpbmRpbmcpICovIF9fd2VicGFja19yZXF1aXJlX18uZChfX3dlYnBhY2tfZXhwb3J0c19fLCBcImRlbGV0ZU1lc2hCdWZmZXJzXCIsIGZ1bmN0aW9uKCkgeyByZXR1cm4gZGVsZXRlTWVzaEJ1ZmZlcnM7IH0pO1xcbi8qIGhhcm1vbnkgaW1wb3J0ICovIHZhciBfbWVzaF9fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fID0gX193ZWJwYWNrX3JlcXVpcmVfXygvKiEgLi9tZXNoICovIFwiLi9zcmMvbWVzaC50c1wiKTtcXG4vKiBoYXJtb255IGltcG9ydCAqLyB2YXIgX21hdGVyaWFsX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8xX18gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKC8qISAuL21hdGVyaWFsICovIFwiLi9zcmMvbWF0ZXJpYWwudHNcIik7XFxuXFxuXFxuZnVuY3Rpb24gZG93bmxvYWRNdGxUZXh0dXJlcyhtdGwsIHJvb3QpIHtcXG4gICAgY29uc3QgbWFwQXR0cmlidXRlcyA9IFtcXG4gICAgICAgIFwibWFwRGlmZnVzZVwiLFxcbiAgICAgICAgXCJtYXBBbWJpZW50XCIsXFxuICAgICAgICBcIm1hcFNwZWN1bGFyXCIsXFxuICAgICAgICBcIm1hcERpc3NvbHZlXCIsXFxuICAgICAgICBcIm1hcEJ1bXBcIixcXG4gICAgICAgIFwibWFwRGlzcGxhY2VtZW50XCIsXFxuICAgICAgICBcIm1hcERlY2FsXCIsXFxuICAgICAgICBcIm1hcEVtaXNzaXZlXCIsXFxuICAgIF07XFxuICAgIGlmICghcm9vdC5lbmRzV2l0aChcIi9cIikpIHtcXG4gICAgICAgIHJvb3QgKz0gXCIvXCI7XFxuICAgIH1cXG4gICAgY29uc3QgdGV4dHVyZXMgPSBbXTtcXG4gICAgZm9yIChjb25zdCBtYXRlcmlhbE5hbWUgaW4gbXRsLm1hdGVyaWFscykge1xcbiAgICAgICAgaWYgKCFtdGwubWF0ZXJpYWxzLmhhc093blByb3BlcnR5KG1hdGVyaWFsTmFtZSkpIHtcXG4gICAgICAgICAgICBjb250aW51ZTtcXG4gICAgICAgIH1cXG4gICAgICAgIGNvbnN0IG1hdGVyaWFsID0gbXRsLm1hdGVyaWFsc1ttYXRlcmlhbE5hbWVdO1xcbiAgICAgICAgZm9yIChjb25zdCBhdHRyIG9mIG1hcEF0dHJpYnV0ZXMpIHtcXG4gICAgICAgICAgICBjb25zdCBtYXBEYXRhID0gbWF0ZXJpYWxbYXR0cl07XFxuICAgICAgICAgICAgaWYgKCFtYXBEYXRhIHx8ICFtYXBEYXRhLmZpbGVuYW1lKSB7XFxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xcbiAgICAgICAgICAgIH1cXG4gICAgICAgICAgICBjb25zdCB1cmwgPSByb290ICsgbWFwRGF0YS5maWxlbmFtZTtcXG4gICAgICAgICAgICB0ZXh0dXJlcy5wdXNoKGZldGNoKHVybClcXG4gICAgICAgICAgICAgICAgLnRoZW4ocmVzcG9uc2UgPT4ge1xcbiAgICAgICAgICAgICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XFxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoKTtcXG4gICAgICAgICAgICAgICAgfVxcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuYmxvYigpO1xcbiAgICAgICAgICAgIH0pXFxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XFxuICAgICAgICAgICAgICAgIGNvbnN0IGltYWdlID0gbmV3IEltYWdlKCk7XFxuICAgICAgICAgICAgICAgIGltYWdlLnNyYyA9IFVSTC5jcmVhdGVPYmplY3RVUkwoZGF0YSk7XFxuICAgICAgICAgICAgICAgIG1hcERhdGEudGV4dHVyZSA9IGltYWdlO1xcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiAoaW1hZ2Uub25sb2FkID0gcmVzb2x2ZSkpO1xcbiAgICAgICAgICAgIH0pXFxuICAgICAgICAgICAgICAgIC5jYXRjaCgoKSA9PiB7XFxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYFVuYWJsZSB0byBkb3dubG9hZCB0ZXh0dXJlOiAke3VybH1gKTtcXG4gICAgICAgICAgICB9KSk7XFxuICAgICAgICB9XFxuICAgIH1cXG4gICAgcmV0dXJuIFByb21pc2UuYWxsKHRleHR1cmVzKTtcXG59XFxuZnVuY3Rpb24gZ2V0TXRsKG1vZGVsT3B0aW9ucykge1xcbiAgICBpZiAoISh0eXBlb2YgbW9kZWxPcHRpb25zLm10bCA9PT0gXCJzdHJpbmdcIikpIHtcXG4gICAgICAgIHJldHVybiBtb2RlbE9wdGlvbnMub2JqLnJlcGxhY2UoL1xcXFwub2JqJC8sIFwiLm10bFwiKTtcXG4gICAgfVxcbiAgICByZXR1cm4gbW9kZWxPcHRpb25zLm10bDtcXG59XFxuLyoqXFxuICogQWNjZXB0cyBhIGxpc3Qgb2YgbW9kZWwgcmVxdWVzdCBvYmplY3RzIGFuZCByZXR1cm5zIGEgUHJvbWlzZSB0aGF0XFxuICogcmVzb2x2ZXMgd2hlbiBhbGwgbW9kZWxzIGhhdmUgYmVlbiBkb3dubG9hZGVkIGFuZCBwYXJzZWQuXFxuICpcXG4gKiBUaGUgbGlzdCBvZiBtb2RlbCBvYmplY3RzIGZvbGxvdyB0aGlzIGludGVyZmFjZTpcXG4gKiB7XFxuICogIG9iajogXFwncGF0aC90by9tb2RlbC5vYmpcXCcsXFxuICogIG10bDogdHJ1ZSB8IFxcJ3BhdGgvdG8vbW9kZWwubXRsXFwnLFxcbiAqICBkb3dubG9hZE10bFRleHR1cmVzOiB0cnVlIHwgZmFsc2VcXG4gKiAgbXRsVGV4dHVyZVJvb3Q6IFxcJy9tb2RlbHMvc3V6YW5uZS9tYXBzXFwnXFxuICogIG5hbWU6IFxcJ3N1emFubmVcXCdcXG4gKiB9XFxuICpcXG4gKiBUaGUgYG9iamAgYXR0cmlidXRlIGlzIHJlcXVpcmVkIGFuZCBzaG91bGQgYmUgdGhlIHBhdGggdG8gdGhlXFxuICogbW9kZWxcXCdzIC5vYmogZmlsZSByZWxhdGl2ZSB0byB0aGUgY3VycmVudCByZXBvIChhYnNvbHV0ZSBVUkxzIGFyZVxcbiAqIHN1Z2dlc3RlZCkuXFxuICpcXG4gKiBUaGUgYG10bGAgYXR0cmlidXRlIGlzIG9wdGlvbmFsIGFuZCBjYW4gZWl0aGVyIGJlIGEgYm9vbGVhbiBvclxcbiAqIGEgcGF0aCB0byB0aGUgbW9kZWxcXCdzIC5tdGwgZmlsZSByZWxhdGl2ZSB0byB0aGUgY3VycmVudCBVUkwuIElmXFxuICogdGhlIHZhbHVlIGlzIGB0cnVlYCwgdGhlbiB0aGUgcGF0aCBhbmQgYmFzZW5hbWUgZ2l2ZW4gZm9yIHRoZSBgb2JqYFxcbiAqIGF0dHJpYnV0ZSBpcyB1c2VkIHJlcGxhY2luZyB0aGUgLm9iaiBzdWZmaXggZm9yIC5tdGxcXG4gKiBFLmcuOiB7b2JqOiBcXCdtb2RlbHMvZm9vLm9ialxcJywgbXRsOiB0cnVlfSB3b3VsZCBzZWFyY2ggZm9yIFxcJ21vZGVscy9mb28ubXRsXFwnXFxuICpcXG4gKiBUaGUgYG5hbWVgIGF0dHJpYnV0ZSBpcyBvcHRpb25hbCBhbmQgaXMgYSBodW1hbiBmcmllbmRseSBuYW1lIHRvIGJlXFxuICogaW5jbHVkZWQgd2l0aCB0aGUgcGFyc2VkIE9CSiBhbmQgTVRMIGZpbGVzLiBJZiBub3QgZ2l2ZW4sIHRoZSBiYXNlIC5vYmpcXG4gKiBmaWxlbmFtZSB3aWxsIGJlIHVzZWQuXFxuICpcXG4gKiBUaGUgYGRvd25sb2FkTXRsVGV4dHVyZXNgIGF0dHJpYnV0ZSBpcyBhIGZsYWcgZm9yIGF1dG9tYXRpY2FsbHkgZG93bmxvYWRpbmdcXG4gKiBhbnkgaW1hZ2VzIGZvdW5kIGluIHRoZSBNVEwgZmlsZSBhbmQgYXR0YWNoaW5nIHRoZW0gdG8gZWFjaCBNYXRlcmlhbFxcbiAqIGNyZWF0ZWQgZnJvbSB0aGF0IGZpbGUuIEZvciBleGFtcGxlLCBpZiBtYXRlcmlhbC5tYXBEaWZmdXNlIGlzIHNldCAodGhlcmVcXG4gKiB3YXMgZGF0YSBpbiB0aGUgTVRMIGZpbGUpLCB0aGVuIG1hdGVyaWFsLm1hcERpZmZ1c2UudGV4dHVyZSB3aWxsIGNvbnRhaW5cXG4gKiB0aGUgZG93bmxvYWRlZCBpbWFnZS4gVGhpcyBvcHRpb24gZGVmYXVsdHMgdG8gYHRydWVgLiBCeSBkZWZhdWx0LCB0aGUgTVRMXFwnc1xcbiAqIFVSTCB3aWxsIGJlIHVzZWQgdG8gZGV0ZXJtaW5lIHRoZSBsb2NhdGlvbiBvZiB0aGUgaW1hZ2VzLlxcbiAqXFxuICogVGhlIGBtdGxUZXh0dXJlUm9vdGAgYXR0cmlidXRlIGlzIG9wdGlvbmFsIGFuZCBzaG91bGQgcG9pbnQgdG8gdGhlIGxvY2F0aW9uXFxuICogb24gdGhlIHNlcnZlciB0aGF0IHRoaXMgTVRMXFwncyB0ZXh0dXJlIGZpbGVzIGFyZSBsb2NhdGVkLiBUaGUgZGVmYXVsdCBpcyB0b1xcbiAqIHVzZSB0aGUgTVRMIGZpbGVcXCdzIGxvY2F0aW9uLlxcbiAqXFxuICogQHJldHVybnMge1Byb21pc2V9IHRoZSByZXN1bHQgb2YgZG93bmxvYWRpbmcgdGhlIGdpdmVuIGxpc3Qgb2YgbW9kZWxzLiBUaGVcXG4gKiBwcm9taXNlIHdpbGwgcmVzb2x2ZSB3aXRoIGFuIG9iamVjdCB3aG9zZSBrZXlzIGFyZSB0aGUgbmFtZXMgb2YgdGhlIG1vZGVsc1xcbiAqIGFuZCB0aGUgdmFsdWUgaXMgaXRzIE1lc2ggb2JqZWN0LiBFYWNoIE1lc2ggb2JqZWN0IHdpbGwgYXV0b21hdGljYWxseVxcbiAqIGhhdmUgaXRzIGFkZE1hdGVyaWFsTGlicmFyeSgpIG1ldGhvZCBjYWxsZWQgdG8gc2V0IHRoZSBnaXZlbiBNVEwgZGF0YSAoaWYgZ2l2ZW4pLlxcbiAqL1xcbmZ1bmN0aW9uIGRvd25sb2FkTW9kZWxzKG1vZGVscykge1xcbiAgICBjb25zdCBmaW5pc2hlZCA9IFtdO1xcbiAgICBmb3IgKGNvbnN0IG1vZGVsIG9mIG1vZGVscykge1xcbiAgICAgICAgaWYgKCFtb2RlbC5vYmopIHtcXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXFwnXCJvYmpcIiBhdHRyaWJ1dGUgb2YgbW9kZWwgb2JqZWN0IG5vdCBzZXQuIFRoZSAub2JqIGZpbGUgaXMgcmVxdWlyZWQgdG8gYmUgc2V0IFxcJyArXFxuICAgICAgICAgICAgICAgIFwiaW4gb3JkZXIgdG8gdXNlIGRvd25sb2FkTW9kZWxzKClcIik7XFxuICAgICAgICB9XFxuICAgICAgICBjb25zdCBvcHRpb25zID0ge1xcbiAgICAgICAgICAgIGluZGljZXNQZXJNYXRlcmlhbDogISFtb2RlbC5pbmRpY2VzUGVyTWF0ZXJpYWwsXFxuICAgICAgICAgICAgY2FsY1RhbmdlbnRzQW5kQml0YW5nZW50czogISFtb2RlbC5jYWxjVGFuZ2VudHNBbmRCaXRhbmdlbnRzLFxcbiAgICAgICAgfTtcXG4gICAgICAgIC8vIGlmIHRoZSBuYW1lIGlzIG5vdCBwcm92aWRlZCwgZGVydml2ZSBpdCBmcm9tIHRoZSBnaXZlbiBPQkpcXG4gICAgICAgIGxldCBuYW1lID0gbW9kZWwubmFtZTtcXG4gICAgICAgIGlmICghbmFtZSkge1xcbiAgICAgICAgICAgIGNvbnN0IHBhcnRzID0gbW9kZWwub2JqLnNwbGl0KFwiL1wiKTtcXG4gICAgICAgICAgICBuYW1lID0gcGFydHNbcGFydHMubGVuZ3RoIC0gMV0ucmVwbGFjZShcIi5vYmpcIiwgXCJcIik7XFxuICAgICAgICB9XFxuICAgICAgICBjb25zdCBuYW1lUHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZShuYW1lKTtcXG4gICAgICAgIGNvbnN0IG1lc2hQcm9taXNlID0gZmV0Y2gobW9kZWwub2JqKVxcbiAgICAgICAgICAgIC50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLnRleHQoKSlcXG4gICAgICAgICAgICAudGhlbihkYXRhID0+IHtcXG4gICAgICAgICAgICByZXR1cm4gbmV3IF9tZXNoX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX19bXCJkZWZhdWx0XCJdKGRhdGEsIG9wdGlvbnMpO1xcbiAgICAgICAgfSk7XFxuICAgICAgICBsZXQgbXRsUHJvbWlzZTtcXG4gICAgICAgIC8vIERvd25sb2FkIE1hdGVyaWFsTGlicmFyeSBmaWxlP1xcbiAgICAgICAgaWYgKG1vZGVsLm10bCkge1xcbiAgICAgICAgICAgIGNvbnN0IG10bCA9IGdldE10bChtb2RlbCk7XFxuICAgICAgICAgICAgbXRsUHJvbWlzZSA9IGZldGNoKG10bClcXG4gICAgICAgICAgICAgICAgLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UudGV4dCgpKVxcbiAgICAgICAgICAgICAgICAudGhlbigoZGF0YSkgPT4ge1xcbiAgICAgICAgICAgICAgICBjb25zdCBtYXRlcmlhbCA9IG5ldyBfbWF0ZXJpYWxfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzFfX1tcIk1hdGVyaWFsTGlicmFyeVwiXShkYXRhKTtcXG4gICAgICAgICAgICAgICAgaWYgKG1vZGVsLmRvd25sb2FkTXRsVGV4dHVyZXMgIT09IGZhbHNlKSB7XFxuICAgICAgICAgICAgICAgICAgICBsZXQgcm9vdCA9IG1vZGVsLm10bFRleHR1cmVSb290O1xcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFyb290KSB7XFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZ2V0IHRoZSBkaXJlY3Rvcnkgb2YgdGhlIE1UTCBmaWxlIGFzIGRlZmF1bHRcXG4gICAgICAgICAgICAgICAgICAgICAgICByb290ID0gbXRsLnN1YnN0cigwLCBtdGwubGFzdEluZGV4T2YoXCIvXCIpKTtcXG4gICAgICAgICAgICAgICAgICAgIH1cXG4gICAgICAgICAgICAgICAgICAgIC8vIGRvd25sb2FkTXRsVGV4dHVyZXMgcmV0dXJucyBhIFByb21pc2UgdGhhdFxcbiAgICAgICAgICAgICAgICAgICAgLy8gaXMgcmVzb2x2ZWQgb25jZSBhbGwgb2YgdGhlIGltYWdlcyBpdFxcbiAgICAgICAgICAgICAgICAgICAgLy8gY29udGFpbnMgYXJlIGRvd25sb2FkZWQuIFRoZXNlIGFyZSB0aGVuXFxuICAgICAgICAgICAgICAgICAgICAvLyBhdHRhY2hlZCB0byB0aGUgbWFwIGRhdGEgb2JqZWN0c1xcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKFtQcm9taXNlLnJlc29sdmUobWF0ZXJpYWwpLCBkb3dubG9hZE10bFRleHR1cmVzKG1hdGVyaWFsLCByb290KV0pO1xcbiAgICAgICAgICAgICAgICB9XFxuICAgICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLmFsbChbUHJvbWlzZS5yZXNvbHZlKG1hdGVyaWFsKSwgdW5kZWZpbmVkXSk7XFxuICAgICAgICAgICAgfSlcXG4gICAgICAgICAgICAgICAgLnRoZW4oKHZhbHVlKSA9PiB7XFxuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZVswXTtcXG4gICAgICAgICAgICB9KTtcXG4gICAgICAgIH1cXG4gICAgICAgIGNvbnN0IHBhcnNlZCA9IFtuYW1lUHJvbWlzZSwgbWVzaFByb21pc2UsIG10bFByb21pc2VdO1xcbiAgICAgICAgZmluaXNoZWQucHVzaChQcm9taXNlLmFsbChwYXJzZWQpKTtcXG4gICAgfVxcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoZmluaXNoZWQpLnRoZW4obXMgPT4ge1xcbiAgICAgICAgLy8gdGhlIFwiZmluaXNoZWRcIiBwcm9taXNlIGlzIGEgbGlzdCBvZiBuYW1lLCBNZXNoIGluc3RhbmNlLFxcbiAgICAgICAgLy8gYW5kIE1hdGVyaWFsTGliYXJ5IGluc3RhbmNlLiBUaGlzIHVucGFja3MgYW5kIHJldHVybnMgYW5cXG4gICAgICAgIC8vIG9iamVjdCBtYXBwaW5nIG5hbWUgdG8gTWVzaCAoTWVzaCBwb2ludHMgdG8gTVRMKS5cXG4gICAgICAgIGNvbnN0IG1vZGVscyA9IHt9O1xcbiAgICAgICAgZm9yIChjb25zdCBtb2RlbCBvZiBtcykge1xcbiAgICAgICAgICAgIGNvbnN0IFtuYW1lLCBtZXNoLCBtdGxdID0gbW9kZWw7XFxuICAgICAgICAgICAgbWVzaC5uYW1lID0gbmFtZTtcXG4gICAgICAgICAgICBpZiAobXRsKSB7XFxuICAgICAgICAgICAgICAgIG1lc2guYWRkTWF0ZXJpYWxMaWJyYXJ5KG10bCk7XFxuICAgICAgICAgICAgfVxcbiAgICAgICAgICAgIG1vZGVsc1tuYW1lXSA9IG1lc2g7XFxuICAgICAgICB9XFxuICAgICAgICByZXR1cm4gbW9kZWxzO1xcbiAgICB9KTtcXG59XFxuLyoqXFxuICogVGFrZXMgaW4gYW4gb2JqZWN0IG9mIGBtZXNoX25hbWVgLCBgXFwnL3VybC90by9PQkovZmlsZVxcJ2AgcGFpcnMgYW5kIGEgY2FsbGJhY2tcXG4gKiBmdW5jdGlvbi4gRWFjaCBPQkogZmlsZSB3aWxsIGJlIGFqYXhlZCBpbiBhbmQgYXV0b21hdGljYWxseSBjb252ZXJ0ZWQgdG9cXG4gKiBhbiBPQkouTWVzaC4gV2hlbiBhbGwgZmlsZXMgaGF2ZSBzdWNjZXNzZnVsbHkgZG93bmxvYWRlZCB0aGUgY2FsbGJhY2tcXG4gKiBmdW5jdGlvbiBwcm92aWRlZCB3aWxsIGJlIGNhbGxlZCBhbmQgcGFzc2VkIGluIGFuIG9iamVjdCBjb250YWluaW5nXFxuICogdGhlIG5ld2x5IGNyZWF0ZWQgbWVzaGVzLlxcbiAqXFxuICogKipOb3RlOioqIEluIG9yZGVyIHRvIHVzZSB0aGlzIGZ1bmN0aW9uIGFzIGEgd2F5IHRvIGRvd25sb2FkIG1lc2hlcywgYVxcbiAqIHdlYnNlcnZlciBvZiBzb21lIHNvcnQgbXVzdCBiZSB1c2VkLlxcbiAqXFxuICogQHBhcmFtIHtPYmplY3R9IG5hbWVBbmRBdHRycyBhbiBvYmplY3Qgd2hlcmUgdGhlIGtleSBpcyB0aGUgbmFtZSBvZiB0aGUgbWVzaCBhbmQgdGhlIHZhbHVlIGlzIHRoZSB1cmwgdG8gdGhhdCBtZXNoXFwncyBPQkogZmlsZVxcbiAqXFxuICogQHBhcmFtIHtGdW5jdGlvbn0gY29tcGxldGlvbkNhbGxiYWNrIHNob3VsZCBjb250YWluIGEgZnVuY3Rpb24gdGhhdCB3aWxsIHRha2Ugb25lIHBhcmFtZXRlcjogYW4gb2JqZWN0IGFycmF5IHdoZXJlIHRoZSBrZXlzIHdpbGwgYmUgdGhlIHVuaXF1ZSBvYmplY3QgbmFtZSBhbmQgdGhlIHZhbHVlIHdpbGwgYmUgYSBNZXNoIG9iamVjdFxcbiAqXFxuICogQHBhcmFtIHtPYmplY3R9IG1lc2hlcyBJbiBjYXNlIG90aGVyIG1lc2hlcyBhcmUgbG9hZGVkIHNlcGFyYXRlbHkgb3IgaWYgYSBwcmV2aW91c2x5IGRlY2xhcmVkIHZhcmlhYmxlIGlzIGRlc2lyZWQgdG8gYmUgdXNlZCwgcGFzcyBpbiBhIChwb3NzaWJseSBlbXB0eSkganNvbiBvYmplY3Qgb2YgdGhlIHBhdHRlcm46IHsgXFwnPG1lc2hfbmFtZT5cXCc6IE9CSi5NZXNoIH1cXG4gKlxcbiAqL1xcbmZ1bmN0aW9uIGRvd25sb2FkTWVzaGVzKG5hbWVBbmRVUkxzLCBjb21wbGV0aW9uQ2FsbGJhY2ssIG1lc2hlcykge1xcbiAgICBpZiAobWVzaGVzID09PSB1bmRlZmluZWQpIHtcXG4gICAgICAgIG1lc2hlcyA9IHt9O1xcbiAgICB9XFxuICAgIGNvbnN0IGNvbXBsZXRlZCA9IFtdO1xcbiAgICBmb3IgKGNvbnN0IG1lc2hfbmFtZSBpbiBuYW1lQW5kVVJMcykge1xcbiAgICAgICAgaWYgKCFuYW1lQW5kVVJMcy5oYXNPd25Qcm9wZXJ0eShtZXNoX25hbWUpKSB7XFxuICAgICAgICAgICAgY29udGludWU7XFxuICAgICAgICB9XFxuICAgICAgICBjb25zdCB1cmwgPSBuYW1lQW5kVVJMc1ttZXNoX25hbWVdO1xcbiAgICAgICAgY29tcGxldGVkLnB1c2goZmV0Y2godXJsKVxcbiAgICAgICAgICAgIC50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLnRleHQoKSlcXG4gICAgICAgICAgICAudGhlbihkYXRhID0+IHtcXG4gICAgICAgICAgICByZXR1cm4gW21lc2hfbmFtZSwgbmV3IF9tZXNoX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX19bXCJkZWZhdWx0XCJdKGRhdGEpXTtcXG4gICAgICAgIH0pKTtcXG4gICAgfVxcbiAgICBQcm9taXNlLmFsbChjb21wbGV0ZWQpLnRoZW4obXMgPT4ge1xcbiAgICAgICAgZm9yIChjb25zdCBbbmFtZSwgbWVzaF0gb2YgbXMpIHtcXG4gICAgICAgICAgICBtZXNoZXNbbmFtZV0gPSBtZXNoO1xcbiAgICAgICAgfVxcbiAgICAgICAgcmV0dXJuIGNvbXBsZXRpb25DYWxsYmFjayhtZXNoZXMpO1xcbiAgICB9KTtcXG59XFxuZnVuY3Rpb24gX2J1aWxkQnVmZmVyKGdsLCB0eXBlLCBkYXRhLCBpdGVtU2l6ZSkge1xcbiAgICBjb25zdCBidWZmZXIgPSBnbC5jcmVhdGVCdWZmZXIoKTtcXG4gICAgY29uc3QgYXJyYXlWaWV3ID0gdHlwZSA9PT0gZ2wuQVJSQVlfQlVGRkVSID8gRmxvYXQzMkFycmF5IDogVWludDE2QXJyYXk7XFxuICAgIGdsLmJpbmRCdWZmZXIodHlwZSwgYnVmZmVyKTtcXG4gICAgZ2wuYnVmZmVyRGF0YSh0eXBlLCBuZXcgYXJyYXlWaWV3KGRhdGEpLCBnbC5TVEFUSUNfRFJBVyk7XFxuICAgIGJ1ZmZlci5pdGVtU2l6ZSA9IGl0ZW1TaXplO1xcbiAgICBidWZmZXIubnVtSXRlbXMgPSBkYXRhLmxlbmd0aCAvIGl0ZW1TaXplO1xcbiAgICByZXR1cm4gYnVmZmVyO1xcbn1cXG4vKipcXG4gKiBUYWtlcyBpbiB0aGUgV2ViR0wgY29udGV4dCBhbmQgYSBNZXNoLCB0aGVuIGNyZWF0ZXMgYW5kIGFwcGVuZHMgdGhlIGJ1ZmZlcnNcXG4gKiB0byB0aGUgbWVzaCBvYmplY3QgYXMgYXR0cmlidXRlcy5cXG4gKlxcbiAqIEBwYXJhbSB7V2ViR0xSZW5kZXJpbmdDb250ZXh0fSBnbCB0aGUgYGNhbnZhcy5nZXRDb250ZXh0KFxcJ3dlYmdsXFwnKWAgY29udGV4dCBpbnN0YW5jZVxcbiAqIEBwYXJhbSB7TWVzaH0gbWVzaCBhIHNpbmdsZSBgT0JKLk1lc2hgIGluc3RhbmNlXFxuICpcXG4gKiBUaGUgbmV3bHkgY3JlYXRlZCBtZXNoIGF0dHJpYnV0ZXMgYXJlOlxcbiAqXFxuICogQXR0cmJ1dGUgfCBEZXNjcmlwdGlvblxcbiAqIDotLS0gfCAtLS1cXG4gKiAqKm5vcm1hbEJ1ZmZlcioqICAgICAgIHxjb250YWlucyB0aGUgbW9kZWwmIzM5O3MgVmVydGV4IE5vcm1hbHNcXG4gKiBub3JtYWxCdWZmZXIuaXRlbVNpemUgIHxzZXQgdG8gMyBpdGVtc1xcbiAqIG5vcm1hbEJ1ZmZlci5udW1JdGVtcyAgfHRoZSB0b3RhbCBudW1iZXIgb2YgdmVydGV4IG5vcm1hbHNcXG4gKiB8XFxuICogKip0ZXh0dXJlQnVmZmVyKiogICAgICB8Y29udGFpbnMgdGhlIG1vZGVsJiMzOTtzIFRleHR1cmUgQ29vcmRpbmF0ZXNcXG4gKiB0ZXh0dXJlQnVmZmVyLml0ZW1TaXplIHxzZXQgdG8gMiBpdGVtc1xcbiAqIHRleHR1cmVCdWZmZXIubnVtSXRlbXMgfHRoZSBudW1iZXIgb2YgdGV4dHVyZSBjb29yZGluYXRlc1xcbiAqIHxcXG4gKiAqKnZlcnRleEJ1ZmZlcioqICAgICAgIHxjb250YWlucyB0aGUgbW9kZWwmIzM5O3MgVmVydGV4IFBvc2l0aW9uIENvb3JkaW5hdGVzIChkb2VzIG5vdCBpbmNsdWRlIHcpXFxuICogdmVydGV4QnVmZmVyLml0ZW1TaXplICB8c2V0IHRvIDMgaXRlbXNcXG4gKiB2ZXJ0ZXhCdWZmZXIubnVtSXRlbXMgIHx0aGUgdG90YWwgbnVtYmVyIG9mIHZlcnRpY2VzXFxuICogfFxcbiAqICoqaW5kZXhCdWZmZXIqKiAgICAgICAgfGNvbnRhaW5zIHRoZSBpbmRpY2VzIG9mIHRoZSBmYWNlc1xcbiAqIGluZGV4QnVmZmVyLml0ZW1TaXplICAgfGlzIHNldCB0byAxXFxuICogaW5kZXhCdWZmZXIubnVtSXRlbXMgICB8dGhlIHRvdGFsIG51bWJlciBvZiBpbmRpY2VzXFxuICpcXG4gKiBBIHNpbXBsZSBleGFtcGxlIChhIGxvdCBvZiBzdGVwcyBhcmUgbWlzc2luZywgc28gZG9uXFwndCBjb3B5IGFuZCBwYXN0ZSk6XFxuICpcXG4gKiAgICAgY29uc3QgZ2wgICA9IGNhbnZhcy5nZXRDb250ZXh0KFxcJ3dlYmdsXFwnKSxcXG4gKiAgICAgICAgIG1lc2ggPSBPQkouTWVzaChvYmpfZmlsZV9kYXRhKTtcXG4gKiAgICAgLy8gY29tcGlsZSB0aGUgc2hhZGVycyBhbmQgY3JlYXRlIGEgc2hhZGVyIHByb2dyYW1cXG4gKiAgICAgY29uc3Qgc2hhZGVyUHJvZ3JhbSA9IGdsLmNyZWF0ZVByb2dyYW0oKTtcXG4gKiAgICAgLy8gY29tcGlsYXRpb24gc3R1ZmYgaGVyZVxcbiAqICAgICAuLi5cXG4gKiAgICAgLy8gbWFrZSBzdXJlIHlvdSBoYXZlIHZlcnRleCwgdmVydGV4IG5vcm1hbCwgYW5kIHRleHR1cmUgY29vcmRpbmF0ZVxcbiAqICAgICAvLyBhdHRyaWJ1dGVzIGxvY2F0ZWQgaW4geW91ciBzaGFkZXJzIGFuZCBhdHRhY2ggdGhlbSB0byB0aGUgc2hhZGVyIHByb2dyYW1cXG4gKiAgICAgc2hhZGVyUHJvZ3JhbS52ZXJ0ZXhQb3NpdGlvbkF0dHJpYnV0ZSA9IGdsLmdldEF0dHJpYkxvY2F0aW9uKHNoYWRlclByb2dyYW0sIFwiYVZlcnRleFBvc2l0aW9uXCIpO1xcbiAqICAgICBnbC5lbmFibGVWZXJ0ZXhBdHRyaWJBcnJheShzaGFkZXJQcm9ncmFtLnZlcnRleFBvc2l0aW9uQXR0cmlidXRlKTtcXG4gKlxcbiAqICAgICBzaGFkZXJQcm9ncmFtLnZlcnRleE5vcm1hbEF0dHJpYnV0ZSA9IGdsLmdldEF0dHJpYkxvY2F0aW9uKHNoYWRlclByb2dyYW0sIFwiYVZlcnRleE5vcm1hbFwiKTtcXG4gKiAgICAgZ2wuZW5hYmxlVmVydGV4QXR0cmliQXJyYXkoc2hhZGVyUHJvZ3JhbS52ZXJ0ZXhOb3JtYWxBdHRyaWJ1dGUpO1xcbiAqXFxuICogICAgIHNoYWRlclByb2dyYW0udGV4dHVyZUNvb3JkQXR0cmlidXRlID0gZ2wuZ2V0QXR0cmliTG9jYXRpb24oc2hhZGVyUHJvZ3JhbSwgXCJhVGV4dHVyZUNvb3JkXCIpO1xcbiAqICAgICBnbC5lbmFibGVWZXJ0ZXhBdHRyaWJBcnJheShzaGFkZXJQcm9ncmFtLnRleHR1cmVDb29yZEF0dHJpYnV0ZSk7XFxuICpcXG4gKiAgICAgLy8gY3JlYXRlIGFuZCBpbml0aWFsaXplIHRoZSB2ZXJ0ZXgsIHZlcnRleCBub3JtYWwsIGFuZCB0ZXh0dXJlIGNvb3JkaW5hdGUgYnVmZmVyc1xcbiAqICAgICAvLyBhbmQgc2F2ZSBvbiB0byB0aGUgbWVzaCBvYmplY3RcXG4gKiAgICAgT0JKLmluaXRNZXNoQnVmZmVycyhnbCwgbWVzaCk7XFxuICpcXG4gKiAgICAgLy8gbm93IHRvIHJlbmRlciB0aGUgbWVzaFxcbiAqICAgICBnbC5iaW5kQnVmZmVyKGdsLkFSUkFZX0JVRkZFUiwgbWVzaC52ZXJ0ZXhCdWZmZXIpO1xcbiAqICAgICBnbC52ZXJ0ZXhBdHRyaWJQb2ludGVyKHNoYWRlclByb2dyYW0udmVydGV4UG9zaXRpb25BdHRyaWJ1dGUsIG1lc2gudmVydGV4QnVmZmVyLml0ZW1TaXplLCBnbC5GTE9BVCwgZmFsc2UsIDAsIDApO1xcbiAqICAgICAvLyBpdFxcJ3MgcG9zc2libGUgdGhhdCB0aGUgbWVzaCBkb2VzblxcJ3QgY29udGFpblxcbiAqICAgICAvLyBhbnkgdGV4dHVyZSBjb29yZGluYXRlcyAoZS5nLiBzdXphbm5lLm9iaiBpbiB0aGUgZGV2ZWxvcG1lbnQgYnJhbmNoKS5cXG4gKiAgICAgLy8gaW4gdGhpcyBjYXNlLCB0aGUgdGV4dHVyZSB2ZXJ0ZXhBdHRyaWJBcnJheSB3aWxsIG5lZWQgdG8gYmUgZGlzYWJsZWRcXG4gKiAgICAgLy8gYmVmb3JlIHRoZSBjYWxsIHRvIGRyYXdFbGVtZW50c1xcbiAqICAgICBpZighbWVzaC50ZXh0dXJlcy5sZW5ndGgpe1xcbiAqICAgICAgIGdsLmRpc2FibGVWZXJ0ZXhBdHRyaWJBcnJheShzaGFkZXJQcm9ncmFtLnRleHR1cmVDb29yZEF0dHJpYnV0ZSk7XFxuICogICAgIH1cXG4gKiAgICAgZWxzZXtcXG4gKiAgICAgICAvLyBpZiB0aGUgdGV4dHVyZSB2ZXJ0ZXhBdHRyaWJBcnJheSBoYXMgYmVlbiBwcmV2aW91c2x5XFxuICogICAgICAgLy8gZGlzYWJsZWQsIHRoZW4gaXQgbmVlZHMgdG8gYmUgcmUtZW5hYmxlZFxcbiAqICAgICAgIGdsLmVuYWJsZVZlcnRleEF0dHJpYkFycmF5KHNoYWRlclByb2dyYW0udGV4dHVyZUNvb3JkQXR0cmlidXRlKTtcXG4gKiAgICAgICBnbC5iaW5kQnVmZmVyKGdsLkFSUkFZX0JVRkZFUiwgbWVzaC50ZXh0dXJlQnVmZmVyKTtcXG4gKiAgICAgICBnbC52ZXJ0ZXhBdHRyaWJQb2ludGVyKHNoYWRlclByb2dyYW0udGV4dHVyZUNvb3JkQXR0cmlidXRlLCBtZXNoLnRleHR1cmVCdWZmZXIuaXRlbVNpemUsIGdsLkZMT0FULCBmYWxzZSwgMCwgMCk7XFxuICogICAgIH1cXG4gKlxcbiAqICAgICBnbC5iaW5kQnVmZmVyKGdsLkFSUkFZX0JVRkZFUiwgbWVzaC5ub3JtYWxCdWZmZXIpO1xcbiAqICAgICBnbC52ZXJ0ZXhBdHRyaWJQb2ludGVyKHNoYWRlclByb2dyYW0udmVydGV4Tm9ybWFsQXR0cmlidXRlLCBtZXNoLm5vcm1hbEJ1ZmZlci5pdGVtU2l6ZSwgZ2wuRkxPQVQsIGZhbHNlLCAwLCAwKTtcXG4gKlxcbiAqICAgICBnbC5iaW5kQnVmZmVyKGdsLkVMRU1FTlRfQVJSQVlfQlVGRkVSLCBtb2RlbC5tZXNoLmluZGV4QnVmZmVyKTtcXG4gKiAgICAgZ2wuZHJhd0VsZW1lbnRzKGdsLlRSSUFOR0xFUywgbW9kZWwubWVzaC5pbmRleEJ1ZmZlci5udW1JdGVtcywgZ2wuVU5TSUdORURfU0hPUlQsIDApO1xcbiAqL1xcbmZ1bmN0aW9uIGluaXRNZXNoQnVmZmVycyhnbCwgbWVzaCkge1xcbiAgICBtZXNoLm5vcm1hbEJ1ZmZlciA9IF9idWlsZEJ1ZmZlcihnbCwgZ2wuQVJSQVlfQlVGRkVSLCBtZXNoLnZlcnRleE5vcm1hbHMsIDMpO1xcbiAgICBtZXNoLnRleHR1cmVCdWZmZXIgPSBfYnVpbGRCdWZmZXIoZ2wsIGdsLkFSUkFZX0JVRkZFUiwgbWVzaC50ZXh0dXJlcywgbWVzaC50ZXh0dXJlU3RyaWRlKTtcXG4gICAgbWVzaC52ZXJ0ZXhCdWZmZXIgPSBfYnVpbGRCdWZmZXIoZ2wsIGdsLkFSUkFZX0JVRkZFUiwgbWVzaC52ZXJ0aWNlcywgMyk7XFxuICAgIG1lc2guaW5kZXhCdWZmZXIgPSBfYnVpbGRCdWZmZXIoZ2wsIGdsLkVMRU1FTlRfQVJSQVlfQlVGRkVSLCBtZXNoLmluZGljZXMsIDEpO1xcbiAgICByZXR1cm4gbWVzaDtcXG59XFxuZnVuY3Rpb24gZGVsZXRlTWVzaEJ1ZmZlcnMoZ2wsIG1lc2gpIHtcXG4gICAgZ2wuZGVsZXRlQnVmZmVyKG1lc2gubm9ybWFsQnVmZmVyKTtcXG4gICAgZ2wuZGVsZXRlQnVmZmVyKG1lc2gudGV4dHVyZUJ1ZmZlcik7XFxuICAgIGdsLmRlbGV0ZUJ1ZmZlcihtZXNoLnZlcnRleEJ1ZmZlcik7XFxuICAgIGdsLmRlbGV0ZUJ1ZmZlcihtZXNoLmluZGV4QnVmZmVyKTtcXG59XFxuXFxuXFxuLy8jIHNvdXJjZVVSTD13ZWJwYWNrOi8vT0JKLy4vc3JjL3V0aWxzLnRzPycpfSwwOlxuLyohKioqKioqKioqKioqKioqKioqKioqKioqKioqKiEqXFxcbiAgISoqKiBtdWx0aSAuL3NyYy9pbmRleC50cyAqKiohXG4gIFxcKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cbi8qISBubyBzdGF0aWMgZXhwb3J0cyBmb3VuZCAqL2Z1bmN0aW9uKG1vZHVsZSxleHBvcnRzLF9fd2VicGFja19yZXF1aXJlX18pe2V2YWwoJ21vZHVsZS5leHBvcnRzID0gX193ZWJwYWNrX3JlcXVpcmVfXygvKiEgL2hvbWUvYWFyb24vZ29vZ2xlX2RyaXZlL3Byb2plY3RzL3dlYmdsLW9iai1sb2FkZXIvc3JjL2luZGV4LnRzICovXCIuL3NyYy9pbmRleC50c1wiKTtcXG5cXG5cXG4vLyMgc291cmNlVVJMPXdlYnBhY2s6Ly9PQkovbXVsdGlfLi9zcmMvaW5kZXgudHM/Jyl9fSl9KSk7IiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBwYXJzZShwYXJhbXMpe1xuICAgICAgdmFyIHRlbXBsYXRlID0gXCJwcmVjaXNpb24gbWVkaXVtcCBmbG9hdDsgXFxuXCIgK1xyXCIgXFxuXCIgK1xuXCIgXFxuXCIgK1xyXCIgXFxuXCIgK1xuXCJ2YXJ5aW5nIHZlYzIgdlRleHR1cmVDb29yZDsgXFxuXCIgK1xyXCIgXFxuXCIgK1xuXCJ2YXJ5aW5nIHZlYzMgdlRyYW5zZm9ybWVkTm9ybWFsOyBcXG5cIiArXHJcIiBcXG5cIiArXG5cInZhcnlpbmcgdmVjNCB2UG9zaXRpb247IFxcblwiICtcclwiIFxcblwiICtcblwiIFxcblwiICtcclwiIFxcblwiICtcblwidm9pZCBtYWluKCkgeyBcXG5cIiArXHJcIiBcXG5cIiArXG5cIiAgZ2xfRnJhZ0NvbG9yID0gdmVjNCgxLCAwLCAwLjUsIDEpOyAvLyByZXR1cm4gcmVkZGlzaC1wdXJwbGUgXFxuXCIgK1xyXCIgXFxuXCIgK1xuXCJ9IFxcblwiIFxuICAgICAgcGFyYW1zID0gcGFyYW1zIHx8IHt9XG4gICAgICBmb3IodmFyIGtleSBpbiBwYXJhbXMpIHtcbiAgICAgICAgdmFyIG1hdGNoZXIgPSBuZXcgUmVnRXhwKFwie3tcIitrZXkrXCJ9fVwiLFwiZ1wiKVxuICAgICAgICB0ZW1wbGF0ZSA9IHRlbXBsYXRlLnJlcGxhY2UobWF0Y2hlciwgcGFyYW1zW2tleV0pXG4gICAgICB9XG4gICAgICByZXR1cm4gdGVtcGxhdGVcbiAgICB9O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBwYXJzZShwYXJhbXMpe1xuICAgICAgdmFyIHRlbXBsYXRlID0gXCJhdHRyaWJ1dGUgdmVjMyBhVmVydGV4UG9zaXRpb247IFxcblwiICtcclwiIFxcblwiICtcblwiYXR0cmlidXRlIHZlYzMgYVZlcnRleE5vcm1hbDsgXFxuXCIgK1xyXCIgXFxuXCIgK1xuXCJhdHRyaWJ1dGUgdmVjMiBhVGV4dHVyZUNvb3JkOyBcXG5cIiArXHJcIiBcXG5cIiArXG5cIiBcXG5cIiArXHJcIiBcXG5cIiArXG5cInVuaWZvcm0gbWF0NCB1TVZNYXRyaXg7IFxcblwiICtcclwiIFxcblwiICtcblwidW5pZm9ybSBtYXQ0IHVQTWF0cml4OyBcXG5cIiArXHJcIiBcXG5cIiArXG5cInVuaWZvcm0gbWF0MyB1Tk1hdHJpeDsgXFxuXCIgK1xyXCIgXFxuXCIgK1xuXCIgXFxuXCIgK1xyXCIgXFxuXCIgK1xuXCJ2YXJ5aW5nIHZlYzIgdlRleHR1cmVDb29yZDsgXFxuXCIgK1xyXCIgXFxuXCIgK1xuXCJ2YXJ5aW5nIHZlYzMgdlRyYW5zZm9ybWVkTm9ybWFsOyBcXG5cIiArXHJcIiBcXG5cIiArXG5cInZhcnlpbmcgdmVjNCB2UG9zaXRpb247IFxcblwiICtcclwiIFxcblwiICtcblwiIFxcblwiICtcclwiIFxcblwiICtcblwidm9pZCBtYWluKHZvaWQpIHsgXFxuXCIgK1xyXCIgXFxuXCIgK1xuXCIgICAgdlBvc2l0aW9uID0gdU1WTWF0cml4ICogdmVjNChhVmVydGV4UG9zaXRpb24sIDEuMCk7IFxcblwiICtcclwiIFxcblwiICtcblwiICAgIGdsX1Bvc2l0aW9uID0gdVBNYXRyaXggKiB2UG9zaXRpb247IFxcblwiICtcclwiIFxcblwiICtcblwiICAgIHZUZXh0dXJlQ29vcmQgPSBhVGV4dHVyZUNvb3JkOyBcXG5cIiArXHJcIiBcXG5cIiArXG5cIiAgICB2VHJhbnNmb3JtZWROb3JtYWwgPSB1Tk1hdHJpeCAqIGFWZXJ0ZXhOb3JtYWw7IFxcblwiICtcclwiIFxcblwiICtcblwifSBcXG5cIiArXHJcIiBcXG5cIiArXG5cIiBcXG5cIiBcbiAgICAgIHBhcmFtcyA9IHBhcmFtcyB8fCB7fVxuICAgICAgZm9yKHZhciBrZXkgaW4gcGFyYW1zKSB7XG4gICAgICAgIHZhciBtYXRjaGVyID0gbmV3IFJlZ0V4cChcInt7XCIra2V5K1wifX1cIixcImdcIilcbiAgICAgICAgdGVtcGxhdGUgPSB0ZW1wbGF0ZS5yZXBsYWNlKG1hdGNoZXIsIHBhcmFtc1trZXldKVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRlbXBsYXRlXG4gICAgfTtcbiJdfQ==
