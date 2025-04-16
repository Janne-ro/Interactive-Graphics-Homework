// This function takes the projection matrix, the translation, and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// The given projection matrix is also a 4x4 matrix stored as an array in column-major order.
// You can use the MatrixMult function defined in project4.html to multiply two 4x4 matrices in the same format.
function GetModelViewProjection( projectionMatrix, translationX, translationY, translationZ, rotationX, rotationY )
{
	// [TO-DO] Modify the code below to form the transformation matrix.
	var trans = [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		translationX, translationY, translationZ, 1
	];

	//Rotation around the x axis
	var rotX = [
		1, 0, 0, 0,
		0, Math.cos(rotationX), -Math.sin(rotationX), 0,
		0, Math.sin(rotationX), Math.cos(rotationX), 0,
		0, 0, 0, 1
	];

	//Rotation around the y axis
	var rotY = [
		Math.cos(rotationY), 0, Math.sin(rotationY), 0,
		0, 1, 0, 0,
		0-Math.sin(rotationY), 0, Math.cos(rotationY), 0,
		0, 0, 0, 1
	];

	var mvp = MatrixMult(MatrixMult(MatrixMult(projectionMatrix, trans), rotX),rotY); //Already returns column-major representation
	return mvp;
}


// [TO-DO] Complete the implementation of the following class.

class MeshDrawer
{
	// The constructor is a good place for taking care of the necessary initializations.
	constructor()
	{
		// [TO-DO] initializations

		//Create program
		this.program = InitShaderProgram(vertexShader, fragmentShader);
		gl.useProgram(this.program)

		// Create and store Buffer objects so we can draw multiple triangles in one frame
		this.vertexBuffer = gl.createBuffer();
		this.texCoordsBuffer = gl.createBuffer();

		//Create uniform locations from the current shader
		this.SwapYZ = gl.getUniformLocation(this.program, "SwapYZ");
		this.mvp = gl.getUniformLocation(this.program, "mvp");
		this.position = gl.getAttribLocation(this.program, "position");
		this.shTexture = gl.getUniformLocation(this.program, "shTexture");
		this.texCoord = gl.getAttribLocation(this.program, "texCoord");
		this.tex = gl.getUniformLocation(this.program, "tex");
		this.textureLoaded = gl.getUniformLocation(this.program, "textureLoaded");

		//Initially swap and textureLoaded is false and shTexture is true
		gl.uniform1i(this.SwapYZ, 0);
		gl.uniform1i(this.shTexture, 1);
		gl.uniform1i(this.textureLoaded, 0);

		//How many triangles are we drawing --> needed for reading out the vertex buffer
		this.numTriangles = 0;
	}
	
	// This method is called every time the user opens an OBJ file.
	// The arguments of this function is an array of 3D vertex positions
	// and an array of 2D texture coordinates.
	// Every item in these arrays is a floating point value, representing one
	// coordinate of the vertex position or texture coordinate.
	// Every three consecutive elements in the vertPos array forms one vertex
	// position and every three consecutive vertex positions form a triangle.
	// Similarly, every two consecutive elements in the texCoords array
	// form the texture coordinate of a vertex.
	// Note that this method can be called multiple times.
	setMesh( vertPos, texCoords)
	{
		gl.useProgram(this.program);
		// [TO-DO] Update the contents of the vertex buffer objects.
		this.numVerticies = vertPos.length / 3;
		this.numTriangles = this.numVerticies / 3; //Actually unneeded 

		// Bind the vertex buffers so that we can update it
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		//Create a float array from the vertex positions array and send it to the GPU.
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

		// Set up the vertex attribute pointer for position
		gl.vertexAttribPointer(this.position, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(this.position);

		// Bind the vertex buffers so that we can update it
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordsBuffer);
		//Create a float array from the vertex positions array and send it to the GPU.
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

		//Set up the texture attribute pointer
		gl.vertexAttribPointer(this.texCoord, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(this.texCoord);
	}
	
	// This method is called when the user changes the state of the
	// "Swap Y-Z Axes" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	swapYZ( swap )
	{
		gl.useProgram(this.program);

		// [TO-DO] Set the uniform parameter(s) of the vertex shader
		if(swap){
			gl.uniform1i(this.SwapYZ, 1);
		}else{
			gl.uniform1i(this.SwapYZ, 0);
		}
		
		
	}
	
	// This method is called to draw the triangular mesh.
	// The argument is the transformation matrix, the same matrix returned
	// by the GetModelViewProjection function above.
	draw(trans)
	{
		gl.useProgram(this.program);

		// [TO-DO] Complete the WebGL initializations before drawing
		
		gl.useProgram(this.program);
			
		// Ensure correct buffer binding before drawing. --> shouldnt be needed in theory
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.vertexAttribPointer(this.position, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(this.position);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordsBuffer);
		gl.vertexAttribPointer(this.texCoord, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(this.texCoord);
			
		// Update the transformation matrix uniform.
		gl.uniformMatrix4fv(this.mvp, false, trans);
			
		//Bind texture to unit 0
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.texture);

		gl.drawArrays(gl.TRIANGLES, 0, this.numVerticies); 
		
	}
	
	// This method is called to set the texture of the mesh.
	// The argument is an HTML IMG element containing the texture data.
	setTexture(img)
	{
		gl.useProgram(this.program);

		// [TO-DO] Bind the texture

		//Set texture loaded to true
		gl.uniform1i(this.textureLoaded, 1);

		//Create texture
		this.texture = gl.createTexture();

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.texture);

		//Set the texture image data
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);

		//Generate Mipmap
		gl.generateMipmap(gl.TEXTURE_2D);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

		//Set uniform sampler to use texture unit 0 (TEXTURE0)
		gl.uniform1i(this.tex, 0);

		// [TO-DO] Now that we have a texture, it might be a good idea to set
		// some uniform parameter(s) of the fragment shader, so that it uses the texture.
		//Already done in the consturctor 
}
	
	// This method is called when the user changes the state of the
	// "Show Texture" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	showTexture( show )
	{
		// [TO-DO] set the uniform parameter(s) of the fragment shader to specify if it should use the texture.
		gl.useProgram(this.program);

		// [TO-DO] Set the uniform parameter(s) of the vertex shader
		if(show){
			gl.uniform1i(this.shTexture, 1);
		}else{
			gl.uniform1i(this.shTexture, 0);
		}
	}
	
}



var fragmentShader= `
	precision mediump float;
	uniform bool shTexture;
	uniform sampler2D tex; //The actual texture
	uniform bool textureLoaded;
	varying vec2 vertexTexCoord; //The info from the vertex shader

	void main() {
		if(shTexture && textureLoaded){
			gl_FragColor = texture2D(tex, vertexTexCoord);
		}else{
			gl_FragColor = vec4(1,gl_FragCoord.z*gl_FragCoord.z,0,1);
		}	
}`

var vertexShader= `
	uniform bool SwapYZ;
	uniform mat4 mvp;
	attribute vec3 position;
	attribute vec2 texCoord; //The texture coordinates that are passed to the fragment shader 
	varying vec2 vertexTexCoord; //Used to communicate between shaders --> the coordinates are given to the fragment shader

	void main(){
		vec3 pos = position;
		//swap Y and Z axis in our visualization
		if(SwapYZ){
			pos = vec3(pos.x, pos.z, pos.y);
		}
		//Aplly rotation to the visualization of the teapot
		gl_Position = mvp * vec4(pos, 1.0);

		//Pass the texture coordinate to the fragment shader
		vertexTexCoord = texCoord;
	}
`
