// const fs = require('fs');
// const main = require('../main');
// const ml5 = require('ml5');



// function NN_createData(data, options, epochs_val, batchSize_val) {

//   const nn = ml5.neuralNetwork(options);
//   console.log(nn);

//   data.forEach(item => {
//     // const inputs = {
//     //   r: item.r,
//     //   g: item.g,
//     //   b: item.b
//     // };
//     // const output = {
//     //   color: item.color
//     // };

//     nn.addData(item.inputs, item.outputs);
//   });

//   console.log(nn);

//   nn.normalizeData();


//   const trainingOptions = {
//     epochs: epochs_val,
//     batchSize: batchSize_val
//   }

//   nn.train(trainingOptions, finishedTraining);

// }


// function finishedTraining(){
//   NN_classify(data[0].inputs);
// }


// function NN_classify(input){
//   nn.classify(input, handleResults);
// }

// function handleResults(error, result) {
//   if(error){
//     console.error(error);
//     return;
//   }
//   console.log(result); // {label: 'red', confidence: 0.8};
// }







// exports.NN_createData = NN_createData;
// exports.NN_classify = NN_classify;
