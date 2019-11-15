let canvas = document.getElementById("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
let gl = canvas.getContext('webgl');

//Time step and time variable
let dt = 0.02;
let time = 0.0;

//************** Shader sources **************
let vertexSource = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`;

let fragmentSource = `
#define PI 3.14159265358979323846
precision highp float;

uniform float width;
uniform float height;
vec2 u_resolution = vec2(width, height);
uniform float u_time;

vec2 rotate2D (vec2 _st, float _angle) {
    _st -= 0.5;
    _st =  mat2(cos(_angle),-sin(_angle), sin(_angle),cos(_angle)) * _st;
    _st += 0.5;
    return _st;
}

vec2 rotateTilePattern(vec2 _st){

    _st *= 2.0;
    //Give each cell an index number according to its position
    float index = 0.0;
    index += step(1., mod(_st.x,2.0));
    index += step(1., mod(_st.y,2.0))*2.0;
    _st = fract(_st);

    float angle = PI;
    if(index == 1.0){/*rotate acc to index*/
        _st = rotate2D(_st,angle*0.5);/*90deg*/
    } else if(index == 2.0){
        _st = rotate2D(_st,angle*-0.5);/*-90deg*/
    } else if(index == 3.0){
        _st = rotate2D(_st,angle);/*180deg*/
    }
    return _st;
}

void main (void) {
  vec2 st = gl_FragCoord.xy/u_resolution.xy;/* normalized coords between 0.0 and 1.0 */
  float d = distance(st,vec2(.5, .5));/*distance from center*/
  st.y *= u_resolution.y/u_resolution.x;/*scale to screen size*/
  float t = u_time/2.0;

  //tiling and rotation
  st *= 10.0; /*scale up */
  st = rotateTilePattern(st);
  float rot = 3.0*PI*sin(mod(t/2.0, PI*4.0));
  st = rotate2D(st, rot);

  //motion
  vec2 uv = st - vec2(.5);
  uv.x*=u_resolution.x/u_resolution.y;
  for(float i = 1.0; i < 3.0; i+=1.0){  
    //undulating motion
    st.x += .1 * 1.0*sin((1.0-d)+PI*t+i*1.5 * st.y);
    st.y += .1 * 1.0*cos((1.0-d)+PI*t+i*4.0 * st.y);
    //radial motion
    st += (.25*(1.0-d))+.13*(d*(sin(t+d))*(abs(sin(2.*length(uv)))));
  }

  float snake = step(st.y, st.x)  - step(st.y, st.x*.8);
  snake *= step(1.0-st.y, st.x)  - step(1.0-st.y, st.x*.1);

  //time and distance varying pixel color
  vec3 color = (t*.2)+(PI*d)+st.xyx+vec3(0,2,4);
  color = .5 + 0.5*(cos(color+d));
  gl_FragColor = vec4(color*snake, 1.0);
}`
;

//************** Utility functions  **************//
/* setup utilities from: https://codepen.io/al-ro/details/paYYpm */
window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.uniform1f(widthHandle, window.innerWidth);
  gl.uniform1f(heightHandle, window.innerHeight);
}

//Compile shader and combine with source
function compileShader(shaderSource, shaderType) {
  let shader = gl.createShader(shaderType);
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw "Shader compile failed with: " + gl.getShaderInfoLog(shader);
  }
  return shader;
}
//************** Create shaders **************
let vertexShader = compileShader(vertexSource, gl.VERTEX_SHADER);
let fragmentShader = compileShader(fragmentSource, gl.FRAGMENT_SHADER);

//Create shader programs
let program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
gl.useProgram(program);

//Set up rectangle covering entire canvas 
let vertexData = new Float32Array([
  -1.0, 1.0, // top left
  -1.0, -1.0, // bottom left
  1.0, 1.0, // top right
  1.0, -1.0, // bottom right
]);

//Create vertex buffer
let vertexDataBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexDataBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

// Layout of our data in the vertex buffer
let positionHandle = gl.getAttribLocation(program, 'position');

gl.enableVertexAttribArray(positionHandle);
gl.vertexAttribPointer(positionHandle,
  2, // position is a vec2 (2 values per component)
  gl.FLOAT, // each component is a float
  false, // don't normalize values
  2 * 4, // two 4 byte float components per vertex (32 bit float is 4 bytes)
  0 // how many bytes inside the buffer to start from
);

//Set uniform handles
let timeHandle = gl.getUniformLocation(program, 'u_time');
let widthHandle = gl.getUniformLocation(program, 'width');
let heightHandle = gl.getUniformLocation(program, 'height');

gl.uniform1f(widthHandle, window.innerWidth);
gl.uniform1f(heightHandle, window.innerHeight);

function draw() {

  time += dt;
  gl.uniform1f(timeHandle, time);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  requestAnimationFrame(draw);
}

draw();

