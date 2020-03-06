var glmatrix = require('gl-matrix');
var svs  = require('./shader/vertex.c');
var sfs  = require('./shader/fragment.c');
var OBJ = require('webgl-obj-loader');

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

    // Create vertex and fragment shaders
    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, svs());
    gl.compileShader(vertexShader);
    
    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, sfs());
    gl.compileShader(fragmentShader);
    
    var shaders = [vertexShader, fragmentShader];
    var program = gl.createProgram();
    shaders.forEach( (shader) => {
        gl.attachShader(program, shader);
    });
    gl.linkProgram(program);
    gl.useProgram(program);
    
    // make sure you have vertex, vertex normal, and texture coordinate
    // attributes located in your shaders and attach them to the shader program
    program.vertexPositionAttribute = gl.getAttribLocation(program, "aVertexPosition");
    gl.enableVertexAttribArray(program.vertexPositionAttribute);
    
    program.vertexNormalAttribute = gl.getAttribLocation(program, "aVertexNormal");
    gl.enableVertexAttribArray(program.vertexNormalAttribute);
    
    program.textureCoordAttribute = gl.getAttribLocation(program, "aTextureCoord");
    gl.enableVertexAttribArray(program.textureCoordAttribute);
    
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
        gl.enableVertexAttribArray(program.textureCoordAttribute);
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.textureBuffer);
        gl.vertexAttribPointer(program.textureCoordAttribute, mesh.textureBuffer.itemSize, gl.FLOAT, false, 0, 0);
    }
    
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