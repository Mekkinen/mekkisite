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
