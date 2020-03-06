var fs = require('fs');
var gl = document.getElementById('glCanvas').getContext('webgl');
var OBJ = require('webgl-obj-loader');

console.log(fs.readFile);

var meshPath = '../models/crystal.obj';
var opt = { encoding: 'utf8' };

const readMeshes = () => {
    fs.readFile(meshPath, opt, (err, data) => {
        if (err) return new Promise(console.error(err));
        mesh = new OBJ.Mesh(data);
        return new Promise(mesh);
    });
};

const webGLStart = (mesh) => { 

    // make sure you have vertex, vertex normal, and texture coordinate
    // attributes located in your shaders and attach them to the shader program
    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
    
    shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
    gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);
    
    shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
    gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);
    
    // refer to the initMeshBuffers docs for an example of
    // how to render the mesh to the screen after calling
    // initMeshBuffers
    // initialize the VBOs
    OBJ.initMeshBuffers(gl, mesh);

    // now to render the mesh
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, mesh.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

    // it's possible that the mesh doesn't contain
    // any texture coordinates (e.g. suzanne.obj in the development branch).
    // in this case, the texture vertexAttribArray will need to be disabled
    // before the call to drawElements
    if(!mesh.textures.length) {
        gl.disableVertexAttribArray(shaderProgram.textureCoordAttribute);
    }
    else {
        // if the texture vertexAttribArray has been previously
        // disabled, then it needs to be re-enabled
        gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.textureBuffer);
        gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, mesh.textureBuffer.itemSize, gl.FLOAT, false, 0, 0);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normalBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, mesh.normalBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.mesh.indexBuffer);
    gl.drawElements(gl.TRIANGLES, model.mesh.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
}

window.onload = () => {
    readMeshes().then( (mesh) => {
        webGLStart(mesh)
    });
}

