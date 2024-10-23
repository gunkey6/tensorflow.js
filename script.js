const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');
document.getElementById('model-summary').innerText = '클릭 후 2초간 스쿼트 자세를 유지하세요.'
document.getElementById('start').style.backgroundColor = 'red';
document.getElementById('start').innerText = '촬영'
const pose = new Pose({
	locateFile: (file) => {
		return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
	}
});
pose.setOptions({
    upperBodyOnly: false,
    modelComplexity: 0,
    smoothLandmarks: false,
    enableSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

pose.onResults(onPose);

let stopresult;
var arr= new Array(33);
for (var i = 0; i<arr.length; i++){
    arr[i]=new Array(4);
}



function onPose(results) {
	//console.log(results);

    canvasCtx.save(); 	// 캔버스 설정 저장
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height); // 캔버스 초기화
    stopresult=results.poseWorldLandmarks;

    // 캔버스에 이미지 넣기
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    drawLandmarks(canvasCtx, results.poseLandmarks, {	// 랜드마크 표시
        color: '#FF0000', lineWidth: 2
    });
    drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS,{	// 연결 선 표시
            color: '#0000FF', lineWidth: 3
        });
    canvasCtx.restore();
    //results.poseLandmarks     
}

const camera = new Camera(videoElement, {
    onFrame: async () => {
        await pose.send({ image: videoElement });
    },
    width: 1280,
    height: 720
});
camera.start();


var a;
var b = false;
function dataOut(){
    document.getElementById('model-summary').innerText = '3';
    setTimeout(function(){
        document.getElementById('model-summary').innerText = '2';
    }, 1000);

    setTimeout(function(){
        document.getElementById('model-summary').innerText = '1';
    }, 2000);
    

    setTimeout(function(){
        videoElement.pause();
        for(let i=0; i <33; i++){
            let tmp=['','','',''];
            let k=0;
            a = JSON.stringify(stopresult[i]);
            //console.log(a[4]);
            for(let j = 0; j<a.length; j++){
                if(b && (a[j]==',' || a[j]=='}') ){
                    b = false;
                    k++;
                }
                else if(b){
                    tmp[k]+=a[j]
                    //console.log(a[j])
                }
                else if(a[j]==':'){
                    b=true;
                }
            }
            arr[i][0]=parseFloat(tmp[0]);
            arr[i][1]=parseFloat(tmp[1]);
            arr[i][2]=parseFloat(tmp[2]);
            arr[i][3]=parseFloat(tmp[3]);
        }
        console.log(arr);
        console.log(calcHip())
        console.log((calcAngle(23, 25, 27)+calcAngle(24, 26, 28))/2)
        console.log(calcKnee())
        console.log(dist(11,12)/dist(31,32));
        loadAndPredict([[calcHip(),(calcAngle(23, 25, 27)+calcAngle(24, 26, 28))/2,dist(11,12)/dist(31,32)]]);
    }, 3000);
}




document.getElementById('start').addEventListener('click',function(){intro();});

function intro(){
    if(videoElement.paused){
        document.getElementById('model-summary').innerText = '클릭 후 2초간 스쿼트 자세를 유지하세요.'
        document.getElementById('start').innerText = '촬영'
        document.getElementById('start').style.backgroundColor = 'red';
        camera.start();
    }
    else {
        dataOut();
    }
}

function mag(v){
    return Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2]);
}
function dot(v1,v2){
    return v1[0]*v2[0]+v1[1]*v2[1]+v1[2]*v2[2];
}

function calcAngle(i, j, k){
    var A = [arr[j][0]-arr[i][0], arr[j][1]-arr[i][1], arr[j][2]-arr[i][2]];
    var B = [arr[k][0]-arr[j][0], arr[k][1]-arr[j][1], arr[k][2]-arr[j][2]];

    return Math.acos(-1*dot(A,B)/(mag(A)*mag(B)))*(180/Math.PI);
}

function calcHip(){ //11 23 25     12 24 26
    var A = [arr[23][0]-arr[11][0]+arr[24][0]-arr[12][0], arr[23][1]-arr[11][1]+arr[24][1]-arr[12][1], arr[23][2]-arr[11][2]+arr[24][2]-arr[12][2]];
    var B = [arr[25][0]-arr[23][0]+arr[26][0]-arr[24][0], arr[25][1]-arr[23][1]+arr[26][1]-arr[24][1], arr[25][2]-arr[23][2]+arr[26][2]-arr[24][2]];

    return Math.acos(-1*dot(A,B)/(mag(A)*mag(B)))*(180/Math.PI);
}

function calcKnee(){ //23 25 27     24 26 28
    var A = [arr[25][0]-arr[23][0]+arr[26][0]-arr[24][0], arr[25][1]-arr[23][1]+arr[26][1]-arr[24][1], arr[25][2]-arr[23][2]+arr[26][2]-arr[24][2]];
    var B = [arr[27][0]-arr[25][0]+arr[28][0]-arr[26][0], arr[27][1]-arr[25][1]+arr[28][1]-arr[26][1], arr[27][2]-arr[25][2]+arr[28][2]-arr[26][2]];

    return Math.acos(-1*dot(A,B)/(mag(A)*mag(B)))*(180/Math.PI);
}

function dist(i,j){
    var v1=arr[i]
    var v2=arr[j]
    return Math.sqrt((v1[0]-v2[0])*(v1[0]-v2[0])+(v1[1]-v2[1])*(v1[1]-v2[1])+(v1[2]-v2[2])*(v1[2]-v2[2]));
}
async function loadAndPredict(inp) {
    const model = await tf.loadLayersModel('https://raw.githubusercontent.com/gunkey6/tensorflow.js/main/my-model.json');
    //const model = await tf.loadLayersModel('indexeddb://my-model');
    console.log('Model loaded from IndexedDB');

    // 새로운 입력 값으로 예측
    const newInput = tf.tensor2d(inp);
    const newPrediction = model.predict(newInput);
    newPrediction.print();
    //document.getElementById('model-summary').innerText = newPrediction;

    const predictionArray = newPrediction.dataSync()*100; // 또는 await newPrediction.array() 를 사용할 수도 있음

    // 실수 배열을 문자열로 변환하여 출력
    document.getElementById('model-summary').innerText = predictionArray.toString().substring(0, 4) + '점';
    document.getElementById('start').innerText = '초기화'
    document.getElementById('start').style.backgroundColor = 'blue';
}
