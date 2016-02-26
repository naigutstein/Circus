//==============================================================================
//                Naomi Gutstein
//                nyg316
//                EECS335
//                Project B
//==============================================================================

// Vertex shader program
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Color;\n' +
  'attribute vec4 a_Normal;\n' + // Normal
  'uniform mat4 u_ViewMatrix;\n' +
  'uniform mat4 u_ProjMatrix;\n' +
  'uniform mat4 u_ModelMatrix;\n' +
  'uniform vec3 u_LightColor;\n' + // Light color
  'uniform vec3 u_LightDirection;\n' + // world coordinate, normalized
  'varying vec4 v_Color;\n' +

  'void main() {\n' +
  // '  gl_Position = u_ModelMatrix * a_Position;\n' +
  '  gl_Position = u_ProjMatrix * u_ViewMatrix * a_Position;\n' +
  // Make the length of the normal 1.0
   '  vec3 normal = normalize(a_Normal.xyz);\n' +
   // Dot product of light direction and orientation of a surface
  ' float nDotL = max(dot(u_LightDirection, normal), 0.0);\n' +
   // Calculate the color due to diffuse reflection
  ' vec3 diffuse = u_LightColor * a_Color.rgb  * (0.3 + (0.7*nDotL));\n' +
  ' v_Color = vec4(diffuse, a_Color.a);\n' +
  '}\n';

var FSHADER_SOURCE =
  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
  '#endif\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_FragColor = v_Color;\n' +
  '}\n';
  
// Global Variables for the spinning tetrahedron:
var ANGLE_STEP = 45.0;  // default rotation angle rate (deg/sec)  
var floatsPerVertex = 9;	// # of Float32Array elements used for each vertex
													// (x,y,z)position + (r,g,b)color
// Create, init current rotation angle value in JavaScript
var currentAngle = 0.0;
var noseAngle = 0.0;

var sone = 0;
var stwo = 0;
var sthree = 0;
var sfour = 0;
var sfive = 0;
var ssix = 0;


function main() {
//==============================================================================
  // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  var gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

	// Enable 3D depth-test when drawing: don't over-draw at any pixel 
	// unless the new Z value is closer to the eye than the old one..
  gl.depthFunc(gl.LESS);			 // WebGL default setting:
	gl.enable(gl.DEPTH_TEST); 
	
  // Set the vertex coordinates and color (the blue triangle is in the front)
  var n = initVertexBuffers(gl);

  if (n < 0) {
    console.log('Failed to specify the vertex information');
    return;
  }

  // Specify the color for clearing <canvas>
  gl.clearColor(0.25, 0.2, 0.25, 1.0);

  // Get the graphics system storage locations of
  // the uniform variables u_ViewMatrix and u_ProjMatrix.
  var u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  var u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix');
  if (!u_ViewMatrix || !u_ProjMatrix) { 
    console.log('Failed to get u_ViewMatrix or u_ProjMatrix');
    return;
  }

  // Create a JavaScript matrix to specify the view transformation
  var viewMatrix = new Matrix4();


  // Register the event handler to be called on key press
 document.onkeydown= function(ev){keydown(ev, gl, u_ViewMatrix, viewMatrix); };
	

  var u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor');
  var u_LightDirection = gl.getUniformLocation(gl.program, 'u_LightDirection');

    // Set the light color (white)
  gl.uniform3f(u_LightColor, 1, 1, 1);
    // Set the light direction (in the world coordinate)
  var lightDirection = new Vector3([0, 1.0, 0]);
  lightDirection.normalize(); // Normalize
  gl.uniform3fv(u_LightDirection, lightDirection.elements);
  // Create the matrix to specify the camera frustum, 
  // and pass it to the u_ProjMatrix uniform in the graphics system
  var projMatrix = new Matrix4();

  projMatrix.setPerspective(30, canvas.width/canvas.height, 1, 100);

  // YOU TRY IT: make an equivalent camera using matrix-cuon-mod.js
  // perspective-camera matrix made by 'frustum()' function..
  
	// Send this matrix to our Vertex and Fragment shaders through the
	// 'uniform' variable u_ProjMatrix:
  gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);

  draw(gl, currentAngle, noseAngle, u_ViewMatrix, viewMatrix);   // Draw the triangles


// ANIMATION: create 'tick' variable whose value is this function:
//----------------- 
  var tick = function() {
    currentAngle = animate(currentAngle);  // Update the rotation angle
    noseAngle = animatenose(noseAngle);
    draw(gl, currentAngle, noseAngle, u_ViewMatrix, viewMatrix);   // Draw shapes
//    console.log('currentAngle=',currentAngle); // put text in console.
    drawMouth(gl,currentAngle, viewMatrix, u_ViewMatrix); //Updates the snake


    //--------------------------------
    requestAnimationFrame(tick, canvas);   
                      // Request that the browser re-draw the webpage
                      // (causes webpage to endlessly re-draw itself)
  };
  tick();             // start (and continue) animation: draw current image
}

function makeGroundGrid() {
//==============================================================================
// Create a list of vertices that create a large grid of lines in the x,y plane
// centered at x=y=z=0.  Draw this shape using the GL_LINES primitive.

	var xcount = 1000;			// # of lines to draw in x,y to make the grid.
	var ycount = 1000;		
	var xymax	= 500.0;			// grid size; extends to cover +/-xymax in x and y.
 	var xColr = new Float32Array([1.0, 1.0, 0.3]);	// bright yellow
 	var yColr = new Float32Array([0.5, 1.0, 0.5]);	// bright green.
 	
	// Create an (global) array to hold this ground-plane's vertices:
	gndVerts = new Float32Array(floatsPerVertex*2*(xcount+ycount));
						// draw a grid made of xcount+ycount lines; 2 vertices per line.
						
	var xgap = xymax/(xcount-1);		// HALF-spacing between lines in x,y;
	var ygap = xymax/(ycount-1);		// (why half? because v==(0line number/2))
	
	// First, step thru x values as we make vertical lines of constant-x:
	for(v=0, j=0; v<2*xcount; v++, j+= floatsPerVertex) {
		if(v%2==0) {	// put even-numbered vertices at (xnow, -xymax, 0)
			gndVerts[j  ] = -xymax + (v  )*xgap;	// x
			gndVerts[j+1] = -xymax;								// y
			gndVerts[j+2] = 0.0;									// z
      gndVerts[j+6] = 0.0
      gndVerts[j+7] = 1.0
      gndVerts[j+8] = 0.0
		}
		else {				// put odd-numbered vertices at (xnow, +xymax, 0).
			gndVerts[j  ] = -xymax + (v-1)*xgap;	// x
			gndVerts[j+1] = xymax;								// y
			gndVerts[j+2] = 0.0;									// z
      gndVerts[j+6] = 0.0
      gndVerts[j+7] = 1.0
      gndVerts[j+8] = 0.0
		}
		gndVerts[j+3] = xColr[0];			// red
		gndVerts[j+4] = xColr[1];			// grn
		gndVerts[j+5] = xColr[2];			// blu
	}
	// Second, step thru y values as wqe make horizontal lines of constant-y:
	// (don't re-initialize j--we're adding more vertices to the array)
	for(v=0; v<2*ycount; v++, j+= floatsPerVertex) {
		if(v%2==0) {		// put even-numbered vertices at (-xymax, ynow, 0)
			gndVerts[j  ] = -xymax;								// x
			gndVerts[j+1] = -xymax + (v  )*ygap;	// y
			gndVerts[j+2] = 0.0;									// z
		}
		else {					// put odd-numbered vertices at (+xymax, ynow, 0).
			gndVerts[j  ] = xymax;								// x
			gndVerts[j+1] = -xymax + (v-1)*ygap;	// y
			gndVerts[j+2] = 0.0;									// z
		}
		gndVerts[j+3] = yColr[0];			// red
		gndVerts[j+4] = yColr[1];			// grn
		gndVerts[j+5] = yColr[2];			// blu
	}
}

function initVertexBuffers(gl) {
//==============================================================================
var c30 = Math.sqrt(0.75);         // == cos(30deg) == sqrt(3) / 2
var sq2 = Math.sqrt(2.0);            

	// make our 'forest' of triangular-shaped trees:
  forestVerts = new Float32Array([
    // 3 Vertex coordinates (x,y,z) and 3 colors (r,g,b)
     //tetrahedron
     // Face 0: (left side)  
     0.0,  0.0, sq2,     Math.random(), 0.0, 0.0,  0, 1, 0, // Node 0
     c30, -0.5, 0.0,     Math.random(), 0.0, 0.0,  0, 1, 0,// Node 1
     0.0,  1.0, 0.0,     Math.random(), 0.0, 0.0,  0, 1, 0,// Node 2
      // Face 1: (right side)
     0.0,  0.0, sq2,     Math.random(), 0.0, 0.0,  0, 1, 0,// Node 0
     0.0,  1.0, 0.0,     Math.random(), 0.0, 0.0,  0, 1, 0,// Node 2
    -c30, -0.5, 0.0,     Math.random(), 0.0, 0.0,  0, 1, 0,// Node 3
      // Face 2: (lower side)
     0.0,  0.0, sq2,     Math.random(), 0.0, 0.0,  0, 1, 0,// Node 0 
    -c30, -0.5, 0.0,     Math.random(), 0.0, 0.0,  0, 1, 0,// Node 3
     c30, -0.5, 0.0,     Math.random(), 0.0, 0.0,  0, 1, 0,// Node 1 
      // Face 3: (base side)  
    -c30, -0.5,  0.0,     Math.random(), 0.0, 0.0,  0, 1, 0,// Node 3
     0.0,  1.0,  0.0,     Math.random(), 0.0, 0.0,  0, 1, 0, // Node 2
     c30, -0.5,  0.0,     Math.random(), 0.0, 0.0,  0, 1, 0,// Node 1

     //------------------snake----------------------------------------------------- 
     0.00, 0.00, 0.0,    Math.random(), 0.0, 0.0,  0, 1, 0,   // first triangle   (x,y,z,w==1)
     0.095, 0.00, 0.0,   Math.random(), 0.0, 0.0,  0, 1, 0,
     0.0,  0.49, 0.0,    Math.random(), 0.0, 0.0,  0, 1, 0,
     0.05, 0.01, 0.0,    Math.random(), 0.0, 0.0,  0, 1, 0,  // second triangle
     0.05, 0.5, 0.0,     Math.random(), 0.0, 0.0,  0, 1, 0,
     0.005, 0.5, 0.0,    Math.random(), 0.0, 0.0,  0, 1, 0,

     //Cube in the middle part
     // +x face
     1.0, -1.0, -1.0,    makeBlack(), makeBlack(), makeBlack(), 0, 1, 0, // Node 3
     1.0,  1.0, -1.0,    makeBlack(), makeBlack(), makeBlack(), 0, 1, 0, // Node 2
     1.0,  1.0,  1.0,    makeBlack(), makeBlack(), makeBlack(), 0, 1, 0,  // Node 4
     
     1.0,  1.0,  1.0,    makeBlack(), makeBlack(), makeBlack(), 0, 1, 0,  // Node 4
     1.0, -1.0,  1.0,    makeBlack(), makeBlack(), makeBlack(), 0, 1, 0, // Node 7
     1.0, -1.0, -1.0,    makeBlack(), makeBlack(), makeBlack(), 0, 1, 0,  // Node 3

    // +y face
    -1.0,  1.0, -1.0,    makeBlack(), makeBlack(), makeBlack(), 0, 1, 0,  // Node 1
    -1.0,  1.0,  1.0,    makeBlack(), makeBlack(), makeBlack(), 0, 1, 0,  // Node 5
     1.0,  1.0,  1.0,    makeBlack(), makeBlack(), makeBlack(), 0, 1, 0,  // Node 4

     1.0,  1.0,  1.0,    makeBlack(), makeBlack(), makeBlack(), 0, 1, 0,  // Node 4
     1.0,  1.0, -1.0,    makeBlack(), makeBlack(), makeBlack(), 0, 1, 0,  // Node 2 
    -1.0,  1.0, -1.0,    makeBlack(), makeBlack(), makeBlack(), 0, 1, 0,  // Node 1

    // +z face
    -1.0,  1.0,  1.0,    makeBlack(), makeBlack(), makeBlack(), 0, 1, 0,  // Node 5
    -1.0, -1.0,  1.0,    makeBlack(), makeBlack(), makeBlack(), 0, 1, 0,  // Node 6
     1.0, -1.0,  1.0,    makeBlack(), makeBlack(), makeBlack(), 0, 1, 0,  // Node 7

     1.0, -1.0,  1.0,    makeBlack(), makeBlack(), makeBlack(), 0, 1, 0,  // Node 7
     1.0,  1.0,  1.0,    makeBlack(), makeBlack(), makeBlack(), 0, 1, 0,  // Node 4
    -1.0,  1.0,  1.0,    makeBlack(), makeBlack(), makeBlack(), 0, 1, 0,  // Node 5

    // -x face
    -1.0, -1.0,  1.0,    makeBlack(), makeBlack(), makeBlack(), 0, 1, 0, // Node 6 
    -1.0,  1.0,  1.0,    makeBlack(), makeBlack(), makeBlack(), 0, 1, 0,  // Node 5 
    -1.0,  1.0, -1.0,    makeBlack(), makeBlack(), makeBlack(), 0, 1, 0,  // Node 1
    
    -1.0,  1.0, -1.0,    makeBlack(), makeBlack(), makeBlack(), 0, 1, 0,  // Node 1
    -1.0, -1.0, -1.0,    makeBlack(), makeBlack(), makeBlack(), 0, 1, 0,  // Node 0  
    -1.0, -1.0,  1.0,    makeBlack(), makeBlack(), makeBlack(), 0, 1, 0,  // Node 6  
    
    // -y face
     1.0, -1.0, -1.0,    makeBlack(), makeBlack(), makeBlack(), 0, 1, 0,  // Node 3
     1.0, -1.0,  1.0,    makeBlack(), makeBlack(), makeBlack(), 0, 1, 0,  // Node 7
    -1.0, -1.0,  1.0,    makeBlack(), makeBlack(), makeBlack(), 0, 1, 0,  // Node 6

    -1.0, -1.0,  1.0,    makeBlack(), makeBlack(), makeBlack(), 0, 1, 0,  // Node 6
    -1.0, -1.0, -1.0,    makeBlack(), makeBlack(), makeBlack(), 0, 1, 0,  // Node 0
     1.0, -1.0, -1.0,    makeBlack(), makeBlack(), makeBlack(), 0, 1, 0, // Node 3

     // -z face
     1.0,  1.0, -1.0,    makeBlack(), makeBlack(), makeBlack(), 0, 1, 0,  // Node 2
     1.0, -1.0, -1.0,    makeBlack(), makeBlack(), makeBlack(), 0, 1, 0,  // Node 3
    -1.0, -1.0, -1.0,    makeBlack(), makeBlack(), makeBlack(), 0, 1, 0,  // Node 0   

    -1.0, -1.0, -1.0,    makeBlack(), makeBlack(), makeBlack(), 0, 1, 0,  // Node 0
    -1.0,  1.0, -1.0,    makeBlack(), makeBlack(), makeBlack(), 0, 1, 0,  // Node 1
     1.0,  1.0, -1.0,    makeBlack(), makeBlack(), makeBlack(), 0, 1, 0,  // Node 2
  
            // Drawing Axes: Draw them using gl.LINES drawing primitive;
      // +x axis RED; +y axis GREEN; +z axis BLUE; origin: GRAY
     0.0,  0.0,  0.0,   0.3,  0.3,  0.3, 0, 1, 0, // X axis line (origin: gray)
     1.3,  0.0,  0.0,   1.0,  0.3,  0.3, 0, 1, 0, //             (endpoint: red)
     
     0.0,  0.0,  0.0,    0.3,  0.3,  0.3, 0, 1, 0,  // Y axis line (origin: white)
     0.0,  0.0,  1.3,    0.3,  1.0,  0.3, 0, 1, 0, //             (endpoint: green)

     0.0,  0.0,  0.0,    0.3,  0.3,  0.3, 0, 1, 0, // Z axis line (origin:white)
     0.0,  1.3,  0.0,   0.3,  0.3,  1.0, 0, 1, 0, //             (endpoint: blue)

  ]);
  
  // Make our 'ground plane'; can you make a'torus' shape too?
  // (recall the 'basic shapes' starter code...)
  makeGroundGrid();


  //make sphere
  makeEyeball();
  makePupil();
  makeIris()
  makeNose();

	// How much space to store all the shapes in one array?
	// (no 'var' means this is a global variable)
	mySiz = forestVerts.length + gndVerts.length + sphVerts.length + pupVerts.length +noseVerts.length+ irisVerts.length;

	// How many vertices total?
	var nn = mySiz / floatsPerVertex;
	console.log('nn is', nn, 'mySiz is', mySiz, 'floatsPerVertex is', floatsPerVertex);

	// Copy all shapes into one big Float32 array:
  var verticesColors = new Float32Array(mySiz);


	// Copy them:  remember where to start for each shape:
	forestStart = 0;							// we store the forest first.
  for(i=0,j=0; j< forestVerts.length; i++,j++) {
  	verticesColors[i] = forestVerts[j];
		} 
	gndStart = i;						// next we'll store the ground-plane;
	for(j=0; j< gndVerts.length; i++, j++) {
		verticesColors[i] = gndVerts[j];
		}
  sphStart = i;           // next we'll store the ground-plane;
  for(j=0; j< sphVerts.length; i++, j++) {
    verticesColors[i] = sphVerts[j];
    }
  pupStart = i;           // next we'll store the ground-plane;
  for(j=0; j< pupVerts.length; i++, j++) {
    verticesColors[i] = pupVerts[j];
    }
  noseStart = i;           // next we'll store the ground-plane;
  for(j=0; j< noseVerts.length; i++, j++) {
    verticesColors[i] = noseVerts[j];
  }
  irisStart = i;           // next we'll store the ground-plane;
  for(j=0; j< irisVerts.length; i++, j++) {
    verticesColors[i] = irisVerts[j];
  }

  
  // Create a vertex buffer object (VBO)
  var vertexColorbuffer = gl.createBuffer();  
  if (!vertexColorbuffer) {
    console.log('Failed to create the buffer object');
    return -1;
  }

  // Write vertex information to buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorbuffer);
  gl.bufferData(gl.ARRAY_BUFFER, verticesColors, gl.STATIC_DRAW);

  var FSIZE = verticesColors.BYTES_PER_ELEMENT;
  // Assign the buffer object to a_Position and enable the assignment
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if(a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE * 9, 0);
  gl.enableVertexAttribArray(a_Position);
  // Assign the buffer object to a_Color and enable the assignment
  var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
  if(a_Color < 0) {
    console.log('Failed to get the storage location of a_Color');
    return -1;
  }
  gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, FSIZE * 9, FSIZE * 3);
  gl.enableVertexAttribArray(a_Color);

 // Get graphics system's handle for our Vertex Shader's normal-vec-input variable;
  var a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
  if(a_Normal < 0) {
    console.log('Failed to get the storage location of a_Normal');
    return -1;
  }
  // Use handle to specify how to retrieve color data from our VBO:
  gl.vertexAttribPointer(
    a_Normal,         // choose Vertex Shader attribute to fill with data
    3,              // how many values? 1,2,3 or 4. (we're using x,y,z)
    gl.FLOAT,       // data type for each value: usually gl.FLOAT
    false,          // did we supply fixed-point data AND it needs normalizing?
    FSIZE * 9,     // Stride -- how many bytes used to store each vertex?
                    // (x,y,z,w, r,g,b, nx,ny,nz) * bytes/value
    FSIZE * 6);     // Offset -- how many bytes from START of buffer to the
                    // value we will actually use?  Need to skip over x,y,z,w,r,g,b
                    
  gl.enableVertexAttribArray(a_Normal);  
                    // Enable assignment of vertex buffer object's position data

  //--------------------------------DONE!
  // Unbind the buffer object 
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return mySiz/floatsPerVertex;	// return # of vertices
}

var g_EyeX = 0.20, g_EyeY = 0.25, g_EyeZ = -4.25; 
var x_lookat = 0, y_lookat = 0, z_lookat = 0;
// Global vars for Eye position. 

var g_near = 1000, g_far = 2000

function keydown(ev, gl, u_ViewMatrix, viewMatrix) {
//------------------------------------------------------
//HTML calls this'Event handler' or 'callback function' when we press a key:

    var yz_angle = Math.atan((y_lookat - g_EyeY)/(z_lookat - g_EyeZ))
    var xz_angle = Math.atan((x_lookat - g_EyeX)/(z_lookat - g_EyeZ))

    if(ev.keyCode == 38) { // up
        y_lookat += 0.1;
        g_far += 10;
    } 
    else if (ev.keyCode == 40){
        y_lookat -= 0.1;
        if (g_near< g_far -10){
          g_far -= 10;
        }  
    }
   else if (ev.keyCode == 37) { // right
      g_EyeX += 0.1
      x_lookat += 0.1
       
    }
    else if (ev.keyCode == 39){
      g_EyeX -=0.1
      x_lookat -= 0.1
        
         
    }
    else if (ev.keyCode == 87){ 
        g_EyeX+=Math.sin(xz_angle)*0.1
        g_EyeY+=Math.sin(yz_angle)*0.1
        g_EyeZ+=Math.cos(xz_angle)*0.1
        x_lookat+=Math.sin(xz_angle)*0.1
        y_lookat+=Math.sin(yz_angle)*0.1
        z_lookat+=Math.cos(xz_angle)*0.1

        g_near -= 30;
         
    }
    else if (ev.keyCode == 83){ //backwards
        g_EyeX-=Math.sin(xz_angle)*0.1
        g_EyeY-=Math.sin(yz_angle)*0.1
        g_EyeZ-=Math.cos(xz_angle)*0.1
        x_lookat-=Math.sin(xz_angle)*0.1
        y_lookat-=Math.sin(yz_angle)*0.1
        z_lookat-=Math.cos(xz_angle)*0.1

       if (g_near< g_far -10){
          g_near += 30;
        } 
          
        
    }
    else if (ev.keyCode == 68){ //rotate left
      x_lookat -= 0.1
      if (g_near< g_far -10){
          g_near += 10;
      }  
    }
    else if (ev.keyCode == 65){ //rotate right
      x_lookat += 0.1;
        g_near -= 10;
    }


    //mouth joints 
    else if (ev.keyCode == 49){ //left most 
        sone = sone + 5
    }
     else if (ev.keyCode == 50){
        stwo = stwo + 5
    }
     else if (ev.keyCode == 51){
        sthree = sthree + 5
    }
     else if (ev.keyCode == 52){
        sfour = sfour + 5
    }
     else if (ev.keyCode == 53){
        sfive = sfive + 5
    }
     else if (ev.keyCode == 54){ //right most
        ssix = ssix + 5
    }

    else { return; } // Prevent the unnecessary drawing
      
}

function draw(gl, currentAngle, noseAngle, u_ViewMatrix, viewMatrix, normalMatrix, u_NormalMatrix) {
//==============================================================================
  var nuCanvas = document.getElementById('webgl');  // get current canvas
  gl = getWebGLContext(nuCanvas);             // and context:

  
  //Make canvas fill the top 3/4 of our browser window:
  nuCanvas.width = innerWidth;
  nuCanvas.height = innerHeight*3/4;
  // Clear <canvas> color AND DEPTH buffer

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Draw in the LEFT 'viewports'
  //------------------------------------------
	// CHANGE from our default viewport:
	// gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
	// to a smaller one:
	gl.viewport(0,  														// Viewport lower-left corner
							0,															// (x,y) location(in pixels)
  						gl.drawingBufferWidth/2, 				// viewport width, height.
  						gl.drawingBufferHeight);
  						
  // Set the matrix to be used for to set the camera view
  viewMatrix.setLookAt(g_EyeX, g_EyeY, g_EyeZ, 	// eye position
  											x_lookat, y_lookat, z_lookat, 		// look-at point 
  											0, 1, 0);								// up vector (+y)

  // Pass the view projection matrix
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);

	// Draw the scene:
	drawMyScene(gl, currentAngle, noseAngle, u_ViewMatrix, viewMatrix, normalMatrix, u_NormalMatrix);
  


    // Draw in the RIGHT of several 'viewports'
  //------------------------------------------
	gl.viewport(gl.drawingBufferWidth/2, 				// Viewport lower-left corner
							0, 															// location(in pixels)
  						gl.drawingBufferWidth/2, 				// viewport width, height.
  						gl.drawingBufferHeight);

  // REPLACE this orthographic camera matrix:
	viewMatrix.setOrtho(1.0, -1.0,          // left,right;
                      -1.0, 1.0,          // bottom, top;
                      g_near, g_far);       // near, far; (always >=0)
 

  // Pass the view projection matrix to our shaders:
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);

	// Draw the scene:
	drawMyScene(gl, currentAngle, noseAngle, u_ViewMatrix, viewMatrix, normalMatrix, u_NormalMatrix);
  
  

}

function drawMyScene(myGL, mycurrentAngle, mynoseAngle, myu_ViewMatrix, myViewMatrix, normalMatrix, u_NormalMatrix) {
//===============================================================================
// Called ONLY from within the 'draw()' function
// Assumes already-correctly-set View matrix and Proj matrix; 
// draws all items in 'world' coords.

  //--------Draw right eyeball---------------------------------------------------
  pushMatrix(myViewMatrix)
  myViewMatrix.translate(0.3, 0.2, 0);
  myViewMatrix.scale(0.10, 0.15, 0.10);     // Make it smaller:
  myViewMatrix.rotate(mycurrentAngle, 0, 1, 0);  // Make new drawing axes that
  // // Drawing:   
  // // Pass our current matrix to the vertex shaders:
  // myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
  //     // Draw just the sphere's vertices

  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);

  myGL.drawArrays(myGL.TRIANGLE_STRIP,        // use this drawing primitive, and
                sphStart/9, // start at this vertex number, and 
                sphVerts.length/9); // draw this many vertices.

 //pop matrix
  myViewMatrix = popMatrix();

 //---------Draw right pupil-----------------------------------------------------
  pushMatrix(myViewMatrix)
  myViewMatrix.translate(0.3, 0.2, -0.2);
  myViewMatrix.scale(0.05, 0.05, 0.05);     // Make it smaller:
  myViewMatrix.rotate(-mycurrentAngle, 0, 1, 0); // Spin on XY diagonal axis
  // // Drawing:   
  // // Pass our current matrix to the vertex shaders:
  // myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
  //     // Draw just the sphere's vertices

  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);

  myGL.drawArrays(myGL.TRIANGLE_STRIP,        // use this drawing primitive, and
                pupStart/9, // start at this vertex number, and 
                pupVerts.length/9); // draw this many vertices.
  
 //pop matrix
 myViewMatrix = popMatrix();

 //---------Draw right Iris-----------------------------------------------------
  pushMatrix(myViewMatrix)
  myViewMatrix.translate(0.3, 0.2, -0.12);
  myViewMatrix.scale(0.075, 0.075, 0.075);     // Make it smaller:
  myViewMatrix.rotate(-mycurrentAngle, 0, 1, 0); // Spin on XY diagonal axis
  // // Drawing:   
  // // Pass our current matrix to the vertex shaders:
  // myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
  //     // Draw just the sphere's vertices

  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);

  myGL.drawArrays(myGL.TRIANGLE_STRIP,        // use this drawing primitive, and
                irisStart/9, // start at this vertex number, and 
                irisVerts.length/9); // draw this many vertices.
  
 //pop matrix
 myViewMatrix = popMatrix();


//---------Draw left eyeball-----------------------------------------------------
  pushMatrix(myViewMatrix)
  myViewMatrix.translate(-0.3, 0.2, 0);
  myViewMatrix.scale(0.10, 0.15, 0.10);     // Make it smaller:
  myViewMatrix.rotate(mycurrentAngle, 0, 1, 0); // Spin on XY diagonal axis
  // // Drawing:   
  // // Pass our current matrix to the vertex shaders:
  // myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
  //     // Draw just the sphere's vertices

  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);

  myGL.drawArrays(myGL.TRIANGLE_STRIP,        // use this drawing primitive, and
                sphStart/9, // start at this vertex number, and 
                sphVerts.length/9); // draw this many vertices.
  
 //pop matrix
 myViewMatrix = popMatrix();

  //---------Draw left pupil-----------------------------------------------------
  pushMatrix(myViewMatrix)
  myViewMatrix.translate(-0.3, 0.2, -0.2);
  myViewMatrix.scale(0.05, 0.05, 0.05);     // Make it smaller:
  myViewMatrix.rotate(-mycurrentAngle, 0, 1, 0); // Spin on XY diagonal axis
  // // Drawing:   
  // // Pass our current matrix to the vertex shaders:
  // myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
  //     // Draw just the sphere's vertices

  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);

  myGL.drawArrays(myGL.TRIANGLE_STRIP,        // use this drawing primitive, and
                pupStart/9, // start at this vertex number, and 
                pupVerts.length/9); // draw this many vertices.
  
 //pop matrix
 myViewMatrix = popMatrix();

  //---------Draw Left Iris-----------------------------------------------------
  pushMatrix(myViewMatrix)
  myViewMatrix.translate(-0.3, 0.2, -0.12);
  myViewMatrix.scale(0.075, 0.075, 0.075);     // Make it smaller:
  myViewMatrix.rotate(-mycurrentAngle, 0, 1, 0); // Spin on XY diagonal axis
  // // Drawing:   
  // // Pass our current matrix to the vertex shaders:
  // myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
  //     // Draw just the sphere's vertices

  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);

  myGL.drawArrays(myGL.TRIANGLE_STRIP,        // use this drawing primitive, and
                irisStart/9, // start at this vertex number, and 
                irisVerts.length/9); // draw this many vertices.
  
 //pop matrix
 myViewMatrix = popMatrix();


   //---------Draw nose-----------------------------------------------------
  pushMatrix(myViewMatrix)
  myViewMatrix.translate(0, 0, 0);
  myViewMatrix.scale(0.1, 0.1, 0.1);     // Make it smaller:
  myViewMatrix.rotate(mynoseAngle, 0, 1, 0); // Spin on XY diagonal axis
  // // Drawing:   
  // // Pass our current matrix to the vertex shaders:
  // myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
  //     // Draw just the sphere's vertices


  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);


  myGL.drawArrays(myGL.TRIANGLE_STRIP,        // use this drawing primitive, and
                noseStart/9, // start at this vertex number, and 
                noseVerts.length/9); // draw this many vertices.

  //------tetrahedrom of nose-----------------------------------------------
  myViewMatrix.translate(0.0, 0.0, -1);  
  myViewMatrix.scale(1,1,-1);              // convert to left-handed coord sys
                                          // to match WebGL display canvas.
  myViewMatrix.scale(1.5, 1.5, 1.5);
              // if you DON'T scale, tetra goes outside the CVV; clipped!
  
  // DRAW TETRA:  Use this matrix to transform & draw 
  //            the first set of vertices stored in our VBO:
      // Pass our current matrix to the vertex shaders:
  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
      // Draw triangles: start at vertex 0 and draw 12 vertices
  myGL.drawArrays(myGL.TRIANGLES, 0, 12);
  myViewMatrix.translate(0.0, 0.0, 1.4);  
  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
  myGL.drawArrays(myGL.LINES, 54, 6);       // start at vertex #12; draw 6 vertices
  
  myViewMatrix = popMatrix();
  pushMatrix(myViewMatrix);
  //-------Eyebrows---------------------------------------------------------
  // DRAW CUBE:   Use ths matrix to transform & draw
  //            the second set of vertices stored in our VBO:
  myViewMatrix.translate(0.3, 0.5, 0.0);

  myViewMatrix.scale(0.1,0.05,0.05,1);
  myViewMatrix.rotate(mynoseAngle, mynoseAngle, 1, 0);

  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
      // Draw just the first set of vertices: start at vertex SHAPE_0_SIZE
  myGL.drawArrays(myGL.TRIANGLES, 18,36);

  drawMouth(myGL, currentAngle, myViewMatrix, myu_ViewMatrix);

  //pop matrix
  myViewMatrix = popMatrix();
  pushMatrix(myViewMatrix);

  // DRAW CUBE:   Use ths matrix to transform & draw
  //            the second set of vertices stored in our VBO:
  myViewMatrix.translate(-0.3, 0.5, 0.0);

  myViewMatrix.scale(0.1,0.05,0.05,1);
  myViewMatrix.rotate(mynoseAngle, mynoseAngle, 1, 0);

  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
  // Draw just the first set of vertices: start at vertex SHAPE_0_SIZE
  myGL.drawArrays(myGL.TRIANGLES, 18,36);

  //pop matrix
  myViewMatrix = popMatrix();
  pushMatrix(myViewMatrix);

  //----------MOUTH-------------------------------------------------------
  drawMouth(myGL, currentAngle, myViewMatrix, myu_ViewMatrix);

  //pop matrix
  myViewMatrix = popMatrix();
  pushMatrix(myViewMatrix);

  //--------Boxes on ground----------------------------------------------

  // DRAW CUBE:   Use ths matrix to transform & draw
  //            the second set of vertices stored in our VBO:
  myViewMatrix.translate(0.6, -0.55, 0.0);

  myViewMatrix.scale(0.1,0.05,0.05,1);
 

  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
  // Draw just the first set of vertices: start at vertex SHAPE_0_SIZE
  myGL.drawArrays(myGL.TRIANGLES, 18,36);

    //pop matrix
  myViewMatrix = popMatrix();
  pushMatrix(myViewMatrix);

  // DRAW CUBE:   Use ths matrix to transform & draw
  //            the second set of vertices stored in our VBO:
  myViewMatrix.translate(-0.6, -0.55, 0.0);

  myViewMatrix.scale(0.1,0.05,0.05,1);
 

  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
  // Draw just the first set of vertices: start at vertex SHAPE_0_SIZE
  myGL.drawArrays(myGL.TRIANGLES, 18,36);

    //pop matrix
  myViewMatrix = popMatrix();
  pushMatrix(myViewMatrix);

  //-------------tetrahedrons on the ground------------------------------
  myViewMatrix.translate(0.7, -0.55, -0.5);  
  myViewMatrix.scale(1,1,-1);              // convert to left-handed coord sys
                                          // to match WebGL display canvas.
  myViewMatrix.scale(0.1, 0.1, 0.1);
              // if you DON'T scale, tetra goes outside the CVV; clipped!


  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
      // Pass our current Normal matrix to the vertex shaders:
  myGL.uniformMatrix4fv(u_NormalMatrix, false, myViewMatrix.elements);

      // Draw triangles: start at vertex 0 and draw 12 vertices
  myGL.drawArrays(myGL.TRIANGLES, 0, 12);

  //pop matrix
  myViewMatrix = popMatrix();
  pushMatrix(myViewMatrix);

  myViewMatrix.translate(-0.7, -0.55, -0.5);  
  myViewMatrix.scale(1,1,-1);              // convert to left-handed coord sys
                                          // to match WebGL display canvas.
  myViewMatrix.scale(0.1, 0.1, 0.1);
              // if you DON'T scale, tetra goes outside the CVV; clipped!
  
  // DRAW TETRA:  Use this matrix to transform & draw 
  //            the first set of vertices stored in our VBO:
      // Pass our current matrix to the vertex shaders:
  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
      // Draw triangles: start at vertex 0 and draw 12 vertices
  myGL.drawArrays(myGL.TRIANGLES, 0, 12);

  myViewMatrix.translate(0.0, 0.0, 1.4);  
  myViewMatrix.scale(2, 2, 2)
  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
  myGL.drawArrays(myGL.LINES, 54, 6);       // start at vertex #12; draw 6 vertices
  //pop matrix
  myViewMatrix = popMatrix();
  pushMatrix(myViewMatrix);

//----------Ground----------------------------------------------------------------
 // Rotate to make a new set of 'world' drawing axes: 
 // old one had "+y points upwards", but
  myViewMatrix.rotate(-90.0, 1,0,0);	// new one has "+z points upwards",
  																		// made by rotating -90 deg on +x-axis.
  																		// Move those new drawing axes to the 
  																		// bottom of the trees:
	myViewMatrix.translate(0.0, 0.0, -0.6);	
	myViewMatrix.scale(0.4, 0.4,0.4);		// shrink the drawing axes 
																			//for nicer-looking ground-plane, and
  // Pass the modified view matrix to our shaders:
  myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
  
  // Now, using these drawing axes, draw our ground plane: 
  myGL.drawArrays(myGL.LINES,							// use this drawing primitive, and
  							gndStart/floatsPerVertex,	// start at this vertex number, and
  							gndVerts.length/floatsPerVertex);		// draw this many vertices

}

function drawMouth(gl, currentAngle, viewMatrix, u_ViewMatrix){
  pushMatrix(viewMatrix);
  //--------middle right of mouth--------------
  viewMatrix.translate(0, -0.4, 0); 

  viewMatrix.scale(0.5,0.5,0.5);      

  viewMatrix.rotate(270+currentAngle*0.4+sfour,0,0,1);  

  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);

  gl.drawArrays(gl.TRIANGLES, 12, 6);

  //-------right middle of mouth----------------
  viewMatrix.translate(0, 0.5, 0); 

  viewMatrix.scale(0.8,0.8,1);      

  viewMatrix.rotate(currentAngle*0.6+sfive, 0,0,1);  

  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);

  gl.drawArrays(gl.TRIANGLES, 12, 6);


  //--------right end of mouth-------------------
  viewMatrix.translate(0.0, 0.5, 0); 

  viewMatrix.scale(0.8,0.8,1);      

  viewMatrix.rotate(currentAngle*0.8+ssix, 0,0,1);  

  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);

  gl.drawArrays(gl.TRIANGLES, 12, 6);

  viewMatrix= popMatrix();

  //-------middle left of mouth------------
  viewMatrix.translate(0, -0.45, 0); 

  viewMatrix.scale(0.5,0.5,0.5);      

  viewMatrix.rotate(90-currentAngle*0.4-sthree,0,0,1);  

  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);

  gl.drawArrays(gl.TRIANGLES, 12, 6);

  //-------left middle of mouth----------------
  viewMatrix.translate(0, 0.5, 0); 

  viewMatrix.scale(0.8,0.8,1);      

  viewMatrix.rotate(-currentAngle*0.6-stwo, 0,0,1);  

  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);

  gl.drawArrays(gl.TRIANGLES, 12, 6);


  //--------left end of mouth-------------------
  viewMatrix.translate(0.0, 0.5, 0); 

  viewMatrix.scale(0.8,0.8,1);      

  viewMatrix.rotate(-currentAngle*0.8-sone, 0,0,1);  

  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);

  gl.drawArrays(gl.TRIANGLES, 12, 6);

  viewMatrix.scale(1, 1, -1)
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.LINES, 54, 6);       // start at vertex #12; draw 6 vertices
}


function makeWhite(){
  var x
  x = 0.8 + Math.random() *0.2;
  return x
}

function makeBlack(){
  var x 
  x = Math.random() * 0.3;
  return x
}


function makeEyeball() {
//==============================================================================
// Make a sphere from one OpenGL TRIANGLE_STRIP primitive.   Make ring-like 
// equal-lattitude 'slices' of the sphere (bounded by planes of constant z), 
// and connect them as a 'stepped spiral' design (see makeCylinder) to build the
// sphere from one triangle strip.
  var slices = 13;    // # of slices of the sphere along the z axis. >=3 req'd
                      // (choose odd # or prime# to avoid accidental symmetry)
  var sliceVerts  = 27; // # of vertices around the top edge of the slice
                      // (same number of vertices on bottom of slice, too)
  var topColr = new Float32Array([1, 0, 0]);  // North Pole: light gray
  var equColr = new Float32Array([0.5, 0, 0]);  // Equator:    bright green
  var botColr = new Float32Array([1, 0, 0]);  // South Pole: brightest gray.
  var sliceAngle = Math.PI/slices;  // lattitude angle spanned by one slice.

  // Create a (global) array to hold this sphere's vertices:
  sphVerts = new Float32Array(  ((slices * 2* sliceVerts) -2) * floatsPerVertex);
                    // # of vertices * # of elements needed to store them. 
                    // each slice requires 2*sliceVerts vertices except 1st and
                    // last ones, which require only 2*sliceVerts-1.
                    
  // Create dome-shaped top slice of sphere at z=+1
  // s counts slices; v counts vertices; 
  // j counts array elements (vertices * elements per vertex)
  var cos0 = 0.0;         // sines,cosines of slice's top, bottom edge.
  var sin0 = 0.0;
  var cos1 = 0.0;
  var sin1 = 0.0; 
  var j = 0;              // initialize our array index
  var isLast = 0;
  var isFirst = 1;
  for(s=0; s<slices; s++) { // for each slice of the sphere,
    // find sines & cosines for top and bottom of this slice
    if(s==0) {
      isFirst = 1;  // skip 1st vertex of 1st slice.
      cos0 = 1.0;   // initialize: start at north pole.
      sin0 = 0.0;
    }
    else {          // otherwise, new top edge == old bottom edge
      isFirst = 0;  
      cos0 = cos1;
      sin0 = sin1;
    }               // & compute sine,cosine for new bottom edge.
    cos1 = Math.cos((s+1)*sliceAngle);
    sin1 = Math.sin((s+1)*sliceAngle);
    // go around the entire slice, generating TRIANGLE_STRIP verts
    // (Note we don't initialize j; grows with each new attrib,vertex, and slice)
    if(s==slices-1) isLast=1; // skip last vertex of last slice.
    for(v=isFirst; v< 2*sliceVerts-isLast; v++, j+=floatsPerVertex) { 
      if(v%2==0)
      {       // put even# vertices at the the slice's top edge
              // (why PI and not 2*PI? because 0 <= v < 2*sliceVerts
              // and thus we can simplify cos(2*PI(v/2*sliceVerts))  
        sphVerts[j  ] = sin0 * Math.cos(Math.PI*(v)/sliceVerts);  
        sphVerts[j+1] = sin0 * Math.sin(Math.PI*(v)/sliceVerts);  
        sphVerts[j+2] = cos0;   
        sphVerts[j+3] = makeWhite();
        sphVerts[j+6] = 0
        sphVerts[j+7] = 1
        sphVerts[j+8] = 0

      }
      else {  // put odd# vertices around the slice's lower edge;
              // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
              //          theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
        sphVerts[j  ] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);    // x
        sphVerts[j+1] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);    // y
        sphVerts[j+2] = cos1;                                       // z
        sphVerts[j+3] = makeWhite(); 
        sphVerts[j+6] = 0
        sphVerts[j+7] = 1
        sphVerts[j+8] = 0    
      }
      if(s==0) {  // Red color in verticies:
        sphVerts[j+4]= makeWhite(); 
        sphVerts[j+5]= makeWhite(); 
        // sphVerts[j+6]=0; 
        }
      else if(s==slices-1) {
        sphVerts[j+4]= makeWhite(); 
        sphVerts[j+5]= makeWhite(); 
        // sphVerts[j+6]=0; 
      }
      else {
          sphVerts[j+4]= makeWhite() // equColr[0]; 
          sphVerts[j+5]= makeWhite();;// equColr[1]; 
          // sphVerts[j+6]=0;// equColr[2];          
      }
    }
  }
}

function makePupil() {
//==============================================================================
// Make a sphere from one OpenGL TRIANGLE_STRIP primitive.   Make ring-like 
// equal-lattitude 'slices' of the sphere (bounded by planes of constant z), 
// and connect them as a 'stepped spiral' design (see makeCylinder) to build the
// sphere from one triangle strip.
  var slices = 13;    // # of slices of the sphere along the z axis. >=3 req'd
                      // (choose odd # or prime# to avoid accidental symmetry)
  var sliceVerts  = 27; // # of vertices around the top edge of the slice
                      // (same number of vertices on bottom of slice, too)
  var topColr = new Float32Array([1, 0, 0]);  // North Pole: light gray
  var equColr = new Float32Array([0.5, 0, 0]);  // Equator:    bright green
  var botColr = new Float32Array([1, 0, 0]);  // South Pole: brightest gray.
  var sliceAngle = Math.PI/slices;  // lattitude angle spanned by one slice.

  // Create a (global) array to hold this sphere's vertices:
  pupVerts = new Float32Array(  ((slices * 2* sliceVerts) -2) * floatsPerVertex);
                    // # of vertices * # of elements needed to store them. 
                    // each slice requires 2*sliceVerts vertices except 1st and
                    // last ones, which require only 2*sliceVerts-1.
                    
  // Create dome-shaped top slice of sphere at z=+1
  // s counts slices; v counts vertices; 
  // j counts array elements (vertices * elements per vertex)
  var cos0 = 0.0;         // sines,cosines of slice's top, bottom edge.
  var sin0 = 0.0;
  var cos1 = 0.0;
  var sin1 = 0.0; 
  var j = 0;              // initialize our array index
  var isLast = 0;
  var isFirst = 1;
  for(s=0; s<slices; s++) { // for each slice of the sphere,
    // find sines & cosines for top and bottom of this slice
    if(s==0) {
      isFirst = 1;  // skip 1st vertex of 1st slice.
      cos0 = 1.0;   // initialize: start at north pole.
      sin0 = 0.0;
    }
    else {          // otherwise, new top edge == old bottom edge
      isFirst = 0;  
      cos0 = cos1;
      sin0 = sin1;
    }               // & compute sine,cosine for new bottom edge.
    cos1 = Math.cos((s+1)*sliceAngle);
    sin1 = Math.sin((s+1)*sliceAngle);
    // go around the entire slice, generating TRIANGLE_STRIP verts
    // (Note we don't initialize j; grows with each new attrib,vertex, and slice)
    if(s==slices-1) isLast=1; // skip last vertex of last slice.
    for(v=isFirst; v< 2*sliceVerts-isLast; v++, j+=floatsPerVertex) { 
      if(v%2==0)
      {       // put even# vertices at the the slice's top edge
              // (why PI and not 2*PI? because 0 <= v < 2*sliceVerts
              // and thus we can simplify cos(2*PI(v/2*sliceVerts))  
        pupVerts[j  ] = sin0 * Math.cos(Math.PI*(v)/sliceVerts);  
        pupVerts[j+1] = sin0 * Math.sin(Math.PI*(v)/sliceVerts);  
        pupVerts[j+2] = cos0;   
        pupVerts[j+3] = makeBlack();  
        pupVerts[j+6] = 0
        pupVerts[j+7] = 1
        pupVerts[j+8] = 0     
      }
      else {  // put odd# vertices around the slice's lower edge;
              // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
              //          theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
        pupVerts[j  ] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);    // x
        pupVerts[j+1] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);    // y
        pupVerts[j+2] = cos1;                                       // z
        pupVerts[j+3] = makeBlack(); 
        pupVerts[j+6] = 0
        pupVerts[j+7] = 1
        pupVerts[j+8] = 0                                        // w.   
      }
      if(s==0) {  // Red color in verticies:
        pupVerts[j+4]= makeBlack() 
        pupVerts[j+5]= makeBlack(); 
        // sphVerts[j+6]=0; 
        }
      else if(s==slices-1) {
        pupVerts[j+4]= makeBlack(); 
        pupVerts[j+5]= makeBlack(); 
        // sphVerts[j+6]=0; 
      }
      else {
          pupVerts[j+4]= makeBlack() // equColr[0]; 
          pupVerts[j+5]= makeBlack();// equColr[1]; 
          // sphVerts[j+6]=0;// equColr[2];          
      }
    }
  }
}
function makeIris() {
//==============================================================================
// Make a sphere from one OpenGL TRIANGLE_STRIP primitive.   Make ring-like 
// equal-lattitude 'slices' of the sphere (bounded by planes of constant z), 
// and connect them as a 'stepped spiral' design (see makeCylinder) to build the
// sphere from one triangle strip.
  var slices = 13;    // # of slices of the sphere along the z axis. >=3 req'd
                      // (choose odd # or prime# to avoid accidental symmetry)
  var sliceVerts  = 27; // # of vertices around the top edge of the slice
                      // (same number of vertices on bottom of slice, too)
  var topColr = new Float32Array([1, 0, 0]);  // North Pole: light gray
  var equColr = new Float32Array([0.5, 0, 0]);  // Equator:    bright green
  var botColr = new Float32Array([1, 0, 0]);  // South Pole: brightest gray.
  var sliceAngle = Math.PI/slices;  // lattitude angle spanned by one slice.

  // Create a (global) array to hold this sphere's vertices:
  irisVerts = new Float32Array(  ((slices * 2* sliceVerts) -2) * floatsPerVertex);
                    // # of vertices * # of elements needed to store them. 
                    // each slice requires 2*sliceVerts vertices except 1st and
                    // last ones, which require only 2*sliceVerts-1.
                    
  // Create dome-shaped top slice of sphere at z=+1
  // s counts slices; v counts vertices; 
  // j counts array elements (vertices * elements per vertex)
  var cos0 = 0.0;         // sines,cosines of slice's top, bottom edge.
  var sin0 = 0.0;
  var cos1 = 0.0;
  var sin1 = 0.0; 
  var j = 0;              // initialize our array index
  var isLast = 0;
  var isFirst = 1;
  for(s=0; s<slices; s++) { // for each slice of the sphere,
    // find sines & cosines for top and bottom of this slice
    if(s==0) {
      isFirst = 1;  // skip 1st vertex of 1st slice.
      cos0 = 1.0;   // initialize: start at north pole.
      sin0 = 0.0;
    }
    else {          // otherwise, new top edge == old bottom edge
      isFirst = 0;  
      cos0 = cos1;
      sin0 = sin1;
    }               // & compute sine,cosine for new bottom edge.
    cos1 = Math.cos((s+1)*sliceAngle);
    sin1 = Math.sin((s+1)*sliceAngle);
    // go around the entire slice, generating TRIANGLE_STRIP verts
    // (Note we don't initialize j; grows with each new attrib,vertex, and slice)
    if(s==slices-1) isLast=1; // skip last vertex of last slice.
    for(v=isFirst; v< 2*sliceVerts-isLast; v++, j+=floatsPerVertex) { 
      if(v%2==0)
      {       // put even# vertices at the the slice's top edge
              // (why PI and not 2*PI? because 0 <= v < 2*sliceVerts
              // and thus we can simplify cos(2*PI(v/2*sliceVerts))  
        irisVerts[j  ] = sin0 * Math.cos(Math.PI*(v)/sliceVerts);  
        irisVerts[j+1] = sin0 * Math.sin(Math.PI*(v)/sliceVerts);  
        irisVerts[j+2] = cos0;   
        irisVerts[j+3] = makeBlack();  
        irisVerts[j+6] = 0
        irisVerts[j+7] = 1
        irisVerts[j+8] = 0     
      }
      else {  // put odd# vertices around the slice's lower edge;
              // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
              //          theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
        irisVerts[j  ] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);    // x
        irisVerts[j+1] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);    // y
        irisVerts[j+2] = cos1;                                       // z
        irisVerts[j+3] = 0;  
        irisVerts[j+6] = 0
        irisVerts[j+7] = 1
        irisVerts[j+8] = 0                                       // w.   
      }
      if(s==0) {  // Red color in verticies:
        irisVerts[j+4]= 0 
        irisVerts[j+5]= Math.random(); 
        // sphVerts[j+6]=0; 
        }
      else if(s==slices-1) {
        irisVerts[j+4]= 0; 
        irisVerts[j+5]= Math.random(); 
        // sphVerts[j+6]=0; 
      }
      else {
          irisVerts[j+4]= 0 // equColr[0]; 
          irisVerts[j+5]= Math.random();// equColr[1]; 
          // sphVerts[j+6]=0;// equColr[2];          
      }
    }
  }
}

function makeNose() {
//==============================================================================
// Make a sphere from one OpenGL TRIANGLE_STRIP primitive.   Make ring-like 
// equal-lattitude 'slices' of the sphere (bounded by planes of constant z), 
// and connect them as a 'stepped spiral' design (see makeCylinder) to build the
// sphere from one triangle strip.
  var slices = 13;    // # of slices of the sphere along the z axis. >=3 req'd
                      // (choose odd # or prime# to avoid accidental symmetry)
  var sliceVerts  = 27; // # of vertices around the top edge of the slice
                      // (same number of vertices on bottom of slice, too)
  var topColr = new Float32Array([1, 0, 0]);  // North Pole: light gray
  var equColr = new Float32Array([0.5, 0, 0]);  // Equator:    bright green
  var botColr = new Float32Array([1, 0, 0]);  // South Pole: brightest gray.
  var sliceAngle = Math.PI/slices;  // lattitude angle spanned by one slice.

  // Create a (global) array to hold this sphere's vertices:
  noseVerts = new Float32Array(  ((slices * 2* sliceVerts) -2) * floatsPerVertex);
                    // # of vertices * # of elements needed to store them. 
                    // each slice requires 2*sliceVerts vertices except 1st and
                    // last ones, which require only 2*sliceVerts-1.
                    
  // Create dome-shaped top slice of sphere at z=+1
  // s counts slices; v counts vertices; 
  // j counts array elements (vertices * elements per vertex)
  var cos0 = 0.0;         // sines,cosines of slice's top, bottom edge.
  var sin0 = 0.0;
  var cos1 = 0.0;
  var sin1 = 0.0; 
  var j = 0;              // initialize our array index
  var isLast = 0;
  var isFirst = 1;
  for(s=0; s<slices; s++) { // for each slice of the sphere,
    // find sines & cosines for top and bottom of this slice
    if(s==0) {
      isFirst = 1;  // skip 1st vertex of 1st slice.
      cos0 = 1.0;   // initialize: start at north pole.
      sin0 = 0.0;
    }
    else {          // otherwise, new top edge == old bottom edge
      isFirst = 0;  
      cos0 = cos1;
      sin0 = sin1;
    }               // & compute sine,cosine for new bottom edge.
    cos1 = Math.cos((s+1)*sliceAngle);
    sin1 = Math.sin((s+1)*sliceAngle);
    // go around the entire slice, generating TRIANGLE_STRIP verts
    // (Note we don't initialize j; grows with each new attrib,vertex, and slice)
    if(s==slices-1) isLast=1; // skip last vertex of last slice.
    for(v=isFirst; v< 2*sliceVerts-isLast; v++, j+=floatsPerVertex) { 
      if(v%2==0)
      {       // put even# vertices at the the slice's top edge
              // (why PI and not 2*PI? because 0 <= v < 2*sliceVerts
              // and thus we can simplify cos(2*PI(v/2*sliceVerts))  
        noseVerts[j  ] = sin0 * Math.cos(Math.PI*(v)/sliceVerts);  
        noseVerts[j+1] = sin0 * Math.sin(Math.PI*(v)/sliceVerts);  
        noseVerts[j+2] = cos0;   
        noseVerts[j+3] = 1; 
      }
      else {  // put odd# vertices around the slice's lower edge;
              // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
              //          theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
        noseVerts[j  ] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);    // x
        noseVerts[j+1] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);    // y
        noseVerts[j+2] = cos1;                                       // z
        noseVerts[j+3] = Math.random(); 

      }
      if(s==0) {  // Red color in verticies:
        noseVerts[j+4]= 0; 
        noseVerts[j+5]= 0;
        // sphVerts[j+6]=0; 
        }
      else if(s==slices-1) {
        noseVerts[j+4]= 0;
        noseVerts[j+5]= 0;
        // sphVerts[j+6]=0; 
      }
      else {
          noseVerts[j+4]= 0; // equColr[0]; 
          noseVerts[j+5]= 0;// equColr[1]; 
          // sphVerts[j+6]=0;// equColr[2];          
      }
        noseVerts[j+6] = noseVerts[j]
        noseVerts[j+7] = noseVerts[j+1]
        noseVerts[j+8] = noseVerts[j+2]                                        // w.   
    }
  }
}

// Last time that this function was called:  (used for animation timing)
var g_last = Date.now();

function animate(angle) {
//==============================================================================
  // Calculate the elapsed time
  var now = Date.now();
  var elapsed = now - g_last;
  g_last = now;
  
  // Update the current rotation angle (adjusted by the elapsed time)
  //  limit the angle to move smoothly between +20 and -85 degrees:
//  if(angle >  120.0 && ANGLE_STEP > 0) ANGLE_STEP = -ANGLE_STEP;
//  if(angle < -120.0 && ANGLE_STEP < 0) ANGLE_STEP = -ANGLE_STEP;
  if(angle > 45 || angle < 0){
    ANGLE_STEP = -ANGLE_STEP}
  var newAngle = angle + ANGLE_STEP/45;

   return newAngle;
}

var gg_last = Date.now();
function animatenose(angle){
  // Calculate the elapsed time
  var now = Date.now();
  var elapsed = now - gg_last;
  gg_last = now;
  
  // Update the current rotation angle (adjusted by the elapsed time)
  //  limit the angle to move smoothly between +20 and -85 degrees:
//  if(angle >  120.0 && ANGLE_STEP > 0) ANGLE_STEP = -ANGLE_STEP;
//  if(angle < -120.0 && ANGLE_STEP < 0) ANGLE_STEP = -ANGLE_STEP;

  var newAngle = angle + (45 * elapsed) / 1000.0;

  return newAngle;
}

