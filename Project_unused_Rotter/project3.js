// [TO-DO] Complete the implementation of the following class and the vertex shader below.

// I was to stupid to wait for the instructions for the thrid project so here we are... :'(

class CurveDrawer {
	constructor()
	{
		this.prog  = InitShaderProgram( curvesVS, curvesFS );

		gl.useProgram(this.prog);
		// [TO-DO] Other initializations should be done here.
		// [TO-DO] This is a good place to get the locations of attributes and uniform variables.
		this.pt0 = document.getElementById("p0");
		this.pt1 = document.getElementById("p1");
		this.pt2 = document.getElementById("p2");
		this.pt3 = document.getElementById("p3");

		
		// Initialize the attribute buffer
		this.steps = 100;
		var tv = [];
		for ( var i=0; i<this.steps; ++i ) {
			tv.push( i / (this.steps-1) );
		}


		// [TO-DO] This is where you can create and set the contents of the vertex buffer object

		// Set "global" variables (uniform) that are used to pass data from the JS program (CPU) to the shaders
		this.pt0Loc = gl.getUniformLocation(this.prog, "p0");
		//console.log("pt0Loc:", this.pt0Loc);
		this.pt1Loc = gl.getUniformLocation(this.prog, "p1");
		this.pt2Loc = gl.getUniformLocation(this.prog, "p2");
		this.pt3Loc = gl.getUniformLocation(this.prog, "p3");

		const x0 = parseFloat(this.pt0.getAttribute("cx"));
		const y0 = parseFloat(this.pt0.getAttribute("cy"));
		gl.uniform2f(this.pt0Loc, x0, y0);
		
		const x1 = parseFloat(this.pt1.getAttribute("cx"));
		const y1 = parseFloat(this.pt1.getAttribute("cy"));
		gl.uniform2f(this.pt1Loc, x1, y1);

		const x2 = parseFloat(this.pt2.getAttribute("cx"));
		const y2 = parseFloat(this.pt2.getAttribute("cy"));
		gl.uniform2f(this.pt2Loc, x2, y2);

		const x3 = parseFloat(this.pt3.getAttribute("cx"));
		const y3 = parseFloat(this.pt3.getAttribute("cy"));
		gl.uniform2f(this.pt3Loc, x3, y3);

		//Create a buffer for the t values
		this.tBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.tBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tv), gl.STATIC_DRAW);
		this.tAttrib = gl.getAttribLocation(this.prog, "t");
		gl.enableVertexAttribArray(this.tAttrib);

		//The layout of the buffer
		gl.vertexAttribPointer(this.tAttrib, 1, gl.FLOAT, false, 0, 0);
	}
	setViewport( width, height )
	{
		// [TO-DO] Do not forget to bind the program before you set a uniform variable value.
		gl.useProgram(this.prog);

		// [TO-DO] This is where we should set the transformation matrix that maps from pixel space to screen space.

		// Build orthographic projection matrix to scale based on width and height so we are in [-1,1]
		//Taken from project3.html
		const mvp = [ 2/width,0,0,0,  0,-2/height,0,0, 0,0,1,0, -1,1,0,1 ];

		this.mvpLoc = gl.getUniformLocation(this.prog, "mvp");
		gl.uniformMatrix4fv(this.mvpLoc, false, mvp);
	}
	updatePoints( pt )
	{
		// [TO-DO] The control points have changed, we must update corresponding uniform variables.
		// [TO-DO] Do not forget to bind the program before you set a uniform variable value.
		gl.useProgram(this.prog);

		// [TO-DO] We can access the x and y coordinates of the i^th control points using
		const x0 = parseFloat(this.pt0.getAttribute("cx"));
		const y0 = parseFloat(this.pt0.getAttribute("cy"));
		gl.uniform2f(this.pt0Loc, x0, y0);
		
		const x1 = parseFloat(this.pt1.getAttribute("cx"));
		const y1 = parseFloat(this.pt1.getAttribute("cy"));
		gl.uniform2f(this.pt1Loc, x1, y1);

		const x2 = parseFloat(this.pt2.getAttribute("cx"));
		const y2 = parseFloat(this.pt2.getAttribute("cy"));
		gl.uniform2f(this.pt2Loc, x2, y2);

		const x3 = parseFloat(this.pt3.getAttribute("cx"));
		const y3 = parseFloat(this.pt3.getAttribute("cy"));
		gl.uniform2f(this.pt3Loc, x3, y3); 

		// The control points have changed, so we must update 
		// the data in the in the vertex buffer

	}
	draw()
	{
		// [TO-DO] This is where we give the command to draw the curve.

		// [TO-DO] Do not forget to bind the program and set the vertex attribute.
		gl.useProgram(this.prog);

		gl.clearColor(1.0, 1.0, 1.0, 1.0); // white background (RGBA)
		gl.clear(gl.COLOR_BUFFER_BIT);

		// Re-bind the t buffer in case something else changed it
		gl.bindBuffer(gl.ARRAY_BUFFER, this.tBuffer);
		gl.vertexAttribPointer(this.tAttrib, 1, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(this.tAttrib);

		//Print out uniforms for debugging
		/* console.log("p0:", gl.getUniform(this.prog, this.pt0Loc));
		console.log("p1:", gl.getUniform(this.prog, this.pt1Loc));
		console.log("p2:", gl.getUniform(this.prog, this.pt2Loc));
		console.log("p3:", gl.getUniform(this.prog, this.pt3Loc)); */

		// Draw points (or line strip)
		gl.drawArrays(gl.LINE_STRIP, 0, this.steps);

		
	}
}

// Vertex Shader
var curvesVS = `
	attribute float t;
	uniform mat4 mvp;
	uniform vec2 p0;
	uniform vec2 p1;
	uniform vec2 p2;
	uniform vec2 p3;
	void main()
	{
		// [TO-DO] Replace the following with the proper vertex shader code

		//Code for bezier interpolation (https://vicrucann.github.io/tutorials/bezier-shader/)
		float x = pow((1.0 - t),3.0) * p0.x + 3.0 * pow((1.0 - t),2.0) * t * p1.x + 3.0 * (1.0 - t) * pow(t,2.0) * p2.x + pow(t,3.0) * p3.x;
        float y = pow((1.0 - t),3.0) * p0.y + 3.0 * pow((1.0 - t),2.0) * t * p1.y + 3.0 * (1.0 - t) * pow(t,2.0) * p2.y + pow(t,3.0) * p3.y;

		gl_Position = mvp*vec4(x, y, 0.0, 1.0);
	}
`;

// Fragment Shader
var curvesFS = `
	precision mediump float;
	void main()
	{
		gl_FragColor = vec4(1,0,0,1);
	}
`;