var glmatrix = require('gl-matrix');
var svs  = require('./shader/vertex.c');
var sfs  = require('./shader/fragment.c');
var OBJ = require('webgl-obj-loader');

<<<<<<< HEAD
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
=======
const createMesh = () => {
    var objStr = document.getElementById('my_cube.obj').innerHTML;
    return new OBJ.Mesh(objStr)
}

window.onload = () => {
    var mesh = createMesh();
    console.log("Mesh: ");
    console.log(mesh);
    webGLStart(mesh);
    //setup();
    //webGLStart(mesh).catch( (err) => console.log(err));
}

const webGLStart = (mesh) => { 

    // Get reference to canvas
    var body = document.getElementsByTagName('body')[0];
    var glcanvas = getCanvas(body);
    var gl = glcanvas.gl;
>>>>>>> 7a7ab620a3b240b7cc14fba2ba1888c23567b178

    // Create vertex and fragment shaders
    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, svs());
    gl.compileShader(vertexShader);
    
    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, sfs());
    gl.compileShader(fragmentShader);
<<<<<<< HEAD

    var success = gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS);
    if (success) {
        console.log("Shader successfully compiled");
        console.log(gl.getShaderInfoLog(fragmentShader));
    } else {
        console.log("Shader not compiled...")
    }
    
    // Link shaders to created gl program
=======
    
>>>>>>> 7a7ab620a3b240b7cc14fba2ba1888c23567b178
    var shaders = [vertexShader, fragmentShader];
    var program = gl.createProgram();
    shaders.forEach( (shader) => {
        gl.attachShader(program, shader);
    });
    gl.linkProgram(program);
<<<<<<< HEAD
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
=======
    gl.useProgram(program);
    
    // make sure you have vertex, vertex normal, and texture coordinate
    // attributes located in your shaders and attach them to the shader program
>>>>>>> 7a7ab620a3b240b7cc14fba2ba1888c23567b178
    program.vertexPositionAttribute = gl.getAttribLocation(program, "aVertexPosition");
    gl.enableVertexAttribArray(program.vertexPositionAttribute);
    
    program.vertexNormalAttribute = gl.getAttribLocation(program, "aVertexNormal");
    gl.enableVertexAttribArray(program.vertexNormalAttribute);
    
    program.textureCoordAttribute = gl.getAttribLocation(program, "aTextureCoord");
    gl.enableVertexAttribArray(program.textureCoordAttribute);
<<<<<<< HEAD

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
=======
    
    // refer to the initMeshBuffers docs for an example of
    // how to render the mesh to the screen after calling
    // initMeshBuffers
    // initialize the VBOs
    OBJ.initMeshBuffers(gl, mesh);
    
    // now to render the mesh
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexBuffer);
    gl.vertexAttribPointer(program.vertexPositionAttribute, mesh.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
    
    // disable texture coordinates if not present
    if (!mesh.textures.length) {
        gl.disableVertexAttribArray(program.textureCoordAttribute);
    }
    else {
        // if the texture vertexAttribArray has been previously
        // disabled, then it needs to be re-enabled
>>>>>>> 7a7ab620a3b240b7cc14fba2ba1888c23567b178
        gl.enableVertexAttribArray(program.textureCoordAttribute);
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.textureBuffer);
        gl.vertexAttribPointer(program.textureCoordAttribute, mesh.textureBuffer.itemSize, gl.FLOAT, false, 0, 0);
    }
<<<<<<< HEAD
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
=======
    
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normalBuffer);
    gl.vertexAttribPointer(program.vertexNormalAttribute, mesh.normalBuffer.itemSize, gl.FLOAT, false, 0, 0);
    
    console.log(gl);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
    gl.drawElements(gl.TRIANGLES, mesh.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
}

// Adds a canvas to the page and start rendering the scene
function setup() {
    var body     = document.getElementsByTagName('body')[0];
    var glCanvas = getCanvas(body);
    
    //create a simple renderer and a simple triangle
    var renderer = simpleRenderer(glCanvas.gl, 1, new Float32Array([-0.5,-0.5,-1.0,0.0,0.5,-1.0,0.5,-0.5,-1.0]));

    //Create a matrix to transform the triangle
    var matrix = glmatrix.mat4.create();
    //Move it back 4 units
    glmatrix.mat4.translate(matrix, matrix, [0.0, 0.0, -4.0]);

    //Called when a frame is scheduled.  A rapid sequence of scene draws creates the animation effect.
    var renderFn = function(timestamp) {
        glmatrix.mat4.rotateY(matrix, matrix, Math.PI/128);
        renderer(matrix, [1, 0, 1]);
        window.requestAnimationFrame(renderFn);
    }

    window.requestAnimationFrame(renderFn);
}

// Get A WebGL context
function getCanvas(parent) {
    //Create a canvas with specified attributes and append it to the parent.
    var canvas = document.createElement('canvas');
    canvas.setAttribute('id', 'glcanvas');
    canvas.setAttribute('width', '400');
    canvas.setAttribute('height', '400');
    parent.appendChild(canvas);
    
    var gl = canvas.getContext('webgl');
    return {canvas: canvas, gl : gl}
}

//Returns a simple rendering function that draws the passed in vertices.
function simpleRenderer(gl, aspect, vertices) {

    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, svs());
    gl.compileShader(vertexShader);
    
    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, sfs());
    gl.compileShader(fragmentShader);
    
    var shaders = [vertexShader, fragmentShader];
    var program = gl.createProgram();
    shaders.forEach(function(shader) {
        gl.attachShader(program, shader);
    })
    gl.linkProgram(program);
    
    return function(parentNode, color) {
        // Commented out because of warning.
        //gl.clear(gl.GL_COLOR_BUFFER_BIT);

        //Field of view is very similar to a cameras field of view.
        var fieldOfView = Math.PI/2;
        //Far edge of scene defines how far away an object can be from the camera before it disappears.
        var farEdgeOfScene = 100;
        //Near edge of scene defines how close an object can be from the camera before it disappears.
        var nearEdgeOfScene = 1;

        //Creates a perspective transformation from the above parameters.
        var perspective = glmatrix.mat4.perspective(glmatrix.mat4.create(), fieldOfView, aspect, nearEdgeOfScene, farEdgeOfScene);
        //Apply perspective to the parent transformation (translate + rotation)
        var projection = glmatrix.mat4.multiply(glmatrix.mat4.create(), perspective, parentNode);
        
        gl.useProgram(program);
        
        var matrixLocation = gl.getUniformLocation(program, "uMVMatrix");
    
        // Set the matrix.
        gl.uniformMatrix4fv(matrixLocation, false, projection);

        // set the color
        var colorLocation = gl.getUniformLocation(program, "u_color");
        gl.uniform4f(colorLocation, color[0], color[1], color[2], 1.0);
        
        // Create a buffer for the positions
        var vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        
        // look up where the vertex data needs to go.
        var positionLocation = gl.getAttribLocation(program, "aVertexPosition");
    
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        gl.drawArrays(gl.TRIANGLES, 0, vertices.length/3);
    }

}
>>>>>>> 7a7ab620a3b240b7cc14fba2ba1888c23567b178
