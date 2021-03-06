import React, { Component } from "react";
import Button from "./components/button";
import Canvas from "./components/canvas";
import GithubCorner from "react-github-corner";
import loadMNIST from "./logic/mnist";
import mnistSamples from "./data/mnist-samples.json";
import ffnnModel from "./data/ffnn-model.json";
import cnnModel from "./data/cnn-model.json";
import Matrix from "./logic/matrix";
import FFNN from "./logic/ffnn/ffnn";
import CNN from "./logic/cnn/cnn";

const TRAIN_FFNN = false;
const TRAIN_CNN = false;
const NEW_FFNN = false;
const NEW_CNN = false;
const USE_STANDARDIZATION = false;

const LOAD_TRAIN = false;
const LOAD_VAL = false;
const LOAD_TEST = false;

const OUTPUT_FFNN_ACCURACY = false;
const OUTPUT_CNN_ACCURACY = false;
const OUTPUT_MNIST = false;

const NUM_TRAIN = 50000;
const NUM_VAL = 10000;
const NUM_TEST = 10000;
const EPSILON = 10 ** -100;

const NUM_MNIST_SAMPLES = 5;

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      ffnnOutputArr: [],
      cnnOutputArr: [],
      ffnnPred: "",
      cnnPred: "",
    };

    // For training
    if (TRAIN_FFNN || TRAIN_CNN) {
      // Do everything after loading
      loadMNIST((data) => {
        this.mnist = data;
        console.log("All files loaded");

        if (OUTPUT_MNIST) {
          console.log(this.mnist);
        }

        // Format and normalize data
        this.formatData();
        this.normalizeData();
        if (USE_STANDARDIZATION) {
          this.standardizeData();
        }

        // FFNN
        if (TRAIN_FFNN) {
          console.log("Starting FFNN training");

          // Create new or load model
          if (NEW_FFNN) {
            this.ffnn = new FFNN([784, 30, 10]);
          } else {
            this.ffnn = new FFNN(null, ffnnModel);

            if (OUTPUT_FFNN_ACCURACY) {
              const accuracy = this.ffnn.accuracy(this.ffnnTestDatas);
              console.log(
                "Accuracy: " +
                  accuracy +
                  "/" +
                  this.ffnnTestDatas.length +
                  ", " +
                  (100 * accuracy) / this.ffnnTestDatas.length +
                  "%"
              );
            }
          }

          // Remember to use much smaller learning rate when using ReLU
          this.ffnn.stochasticGradientDescent(
            this.ffnnTrainDatas,
            1,
            10,
            0.03,
            1.0,
            this.ffnnTestDatas
          );
        }

        // CNN
        if (TRAIN_CNN) {
          console.log("Starting CNN training");

          // Create new or load model
          if (NEW_CNN) {
            this.cnn = new CNN();
          } else {
            this.cnn = new CNN(cnnModel);

            if (OUTPUT_CNN_ACCURACY) {
              this.cnn.test(this.cnnTestDatas);
            }
          }

          this.cnn.train(this.cnnTrainDatas, 1, 0.005, this.cnnTestDatas);
        }
      });
    } else {
      // No training, load both models
      this.ffnn = new FFNN(null, ffnnModel);
      this.cnn = new CNN(cnnModel);
    }

    this.canvasRef = React.createRef();
  }

  componentDidMount() {
    // this.saveSamples();
    this.showSamples();
  }

  /**
   * Outputs JSON of MNIST samples.
   */
  saveSamples() {
    const samples = [];

    // For each digit
    for (let i = 0; i < 10; i++) {
      const sampleImages = [];

      // Find digit samples from test set
      for (let j = 0; j < this.mnist.testImages.length; j++) {
        if (this.mnist.testLabels[j] === i) {
          sampleImages.push(Array.from(this.mnist.testImages[j]));

          // Found desired number of samples
          if (sampleImages.length === NUM_MNIST_SAMPLES) {
            break;
          }
        }
      }

      samples.push(sampleImages);
    }

    console.log(JSON.stringify(samples));
  }

  /**
   * Shows MNISt samples.
   */
  showSamples() {
    // For each digit
    for (let i = 0; i < 10; i++) {
      // For the desired number of samples
      for (let j = 0; j < NUM_MNIST_SAMPLES; j++) {
        // Retrieve canvas and context
        const canvas = document.getElementById(`canvas-${i}-${j}`);
        const ctx = canvas.getContext("2d");

        for (let y = 0; y < 28; y++) {
          for (let x = 0; x < 28; x++) {
            // Create single pixel block and retrieve saved pixel
            const block = ctx.createImageData(1, 1);
            const newVal = 255 * mnistSamples[i][j][y * 28 + x];

            // Assign loaded pixel value
            block.data[0] = newVal;
            block.data[1] = newVal;
            block.data[2] = newVal;
            block.data[3] = 255;

            // Draw to canvas
            ctx.putImageData(block, x, y);
          }
        }
      }
    }
  }

  /**
   * Formats data to suitable format to pass to FFNN and CNN.
   */
  formatData() {
    if (LOAD_TRAIN) {
      console.log("Formatting train data");
      if (TRAIN_FFNN) {
        this.ffnnTrainDatas = this.loadDatas(
          this.mnist.trainImages.slice(0, NUM_TRAIN),
          this.mnist.trainLabels.slice(0, NUM_TRAIN),
          true
        );
      }
      if (TRAIN_CNN) {
        this.cnnTrainDatas = this.loadDatas(
          this.mnist.trainImages.slice(0, NUM_TRAIN),
          this.mnist.trainLabels.slice(0, NUM_TRAIN),
          false
        );
      }
    }

    if (LOAD_VAL) {
      console.log("Formatting validation data");
      if (TRAIN_FFNN) {
        this.ffnnValDatas = this.loadDatas(
          this.mnist.trainImages.slice(NUM_TRAIN, NUM_TRAIN + NUM_VAL),
          this.mnist.trainLabels.slice(NUM_TRAIN, NUM_TRAIN + NUM_VAL),
          true
        );
      }
      if (TRAIN_CNN) {
        this.cnnValDatas = this.loadDatas(
          this.mnist.trainImages.slice(NUM_TRAIN, NUM_TRAIN + NUM_VAL),
          this.mnist.trainLabels.slice(NUM_TRAIN, NUM_TRAIN + NUM_VAL),
          false
        );
      }
    }

    if (LOAD_TEST) {
      console.log("Formatting test data");
      if (TRAIN_FFNN) {
        this.ffnnTestDatas = this.loadDatas(
          this.mnist.testImages.slice(0, NUM_TEST),
          this.mnist.testLabels.slice(0, NUM_TEST),
          true
        );
      }
      if (TRAIN_CNN) {
        this.cnnTestDatas = this.loadDatas(
          this.mnist.testImages.slice(0, NUM_TEST),
          this.mnist.testLabels.slice(0, NUM_TEST),
          false
        );
      }
    }
  }

  /**
   * Loads data into image-label pairs.
   * @param {Array} images Array of images
   * @param {Array} labels Array of labels
   * @param {boolean} isFFNN Whether to load the data for FFNN or CNN
   * @return {Array} Array of image-label pairs
   */
  loadDatas(images, labels, isFFNN) {
    const datas = [];

    for (let i = 0; i < images.length; i++) {
      const inputArr = images[i];
      const targetInt = labels[i];
      const targetArr = [];

      for (let j = 0; j < 10; j++) {
        if (targetInt === j) {
          targetArr.push(1);
        } else {
          targetArr.push(0);
        }
      }

      datas.push([
        isFFNN
          ? Matrix.vectorFromArray(inputArr)
          : Matrix.matrixFromArray(inputArr, 28, 28),
        Matrix.vectorFromArray(targetArr),
      ]);
    }

    return datas;
  }

  /**
   * Normalizes all data.
   */
  normalizeData() {
    // Normalize train images
    if (LOAD_TRAIN) {
      console.log("Normalizing train data");
      if (TRAIN_FFNN) {
        for (let trainData of this.ffnnTrainDatas) {
          trainData[0].div(255);
        }
      }
      if (TRAIN_CNN) {
        for (let trainData of this.cnnTrainDatas) {
          trainData[0].div(255);
        }
      }
    }

    // Normalize validation images
    if (LOAD_VAL) {
      console.log("Normalizing validation data");
      if (TRAIN_FFNN) {
        for (let valData of this.ffnnValDatas) {
          valData[0].div(255);
        }
      }
      if (TRAIN_CNN) {
        for (let valData of this.cnnValDatas) {
          valData[0].div(255);
        }
      }
    }

    // Normalize test images
    if (LOAD_TEST) {
      console.log("Normalizing test data");
      if (TRAIN_FFNN) {
        for (let testData of this.ffnnTestDatas) {
          testData[0].div(255);
        }
      }
      if (TRAIN_CNN) {
        for (let testData of this.cnnTestDatas) {
          testData[0].div(255);
        }
      }
    }
  }

  /**
   * Standardizes all data.
   */
  standardizeData() {
    // Neural network does NOT have predefined train mean and STD, calculate them and use that to standardize everything
    if (!this.ffnn.hasOwnProperty("trainMean")) {
      const mean = new Matrix(784, 1); // mean = sum(pixels) / numTrain
      const std = new Matrix(784, 1); // std = sqrt(sum((pixels - mean)^2) / numTrain)

      // Calculate sum(pixels)
      console.log("Calculating train data mean");
      for (let trainData of this.ffnnTrainDatas) {
        mean.add(trainData[0]);
      }

      // Divide by total number of train datas
      mean.map((x) => x / this.ffnnTrainDatas.length);

      // Calculate sum((pixels - mean)^2)
      console.log("Calculating train data standard deviation");
      for (let trainData of this.ffnnTrainDatas) {
        std.add(Matrix.sub(trainData[0], mean).map((x) => x ** 2));
      }

      // Divide by total number of train datas and square root
      std.map((x) => Math.sqrt(x / this.ffnnTrainDatas.length));

      // Save to neural network
      this.ffnn.trainMean = mean;
      this.ffnn.trainSTD = std;
    }

    // Retrieve mean and std from neural network
    const mean = this.ffnn.trainMean;
    const std = this.ffnn.trainSTD;

    // Standardize train images, add small epsilon so never divide by zero
    if (LOAD_TRAIN) {
      console.log("Standardizing train data");
      for (let i = 0; i < this.ffnnTrainDatas.length; i++) {
        this.ffnnTrainDatas[i][0]
          .sub(mean)
          .div(Matrix.map(std, (x) => x + EPSILON));
      }
    }

    // Standardize validation images, add small epsilon so never divide by zero
    if (LOAD_VAL) {
      console.log("Standardizing validation data");
      for (let i = 0; i < this.ffnnValDatas.length; i++) {
        this.ffnnValDatas[i][0]
          .sub(mean)
          .div(Matrix.map(std, (x) => x + EPSILON));
      }
    }

    // Standardize test images, add small epsilon so never divide by zero
    if (LOAD_TEST) {
      console.log("Standardizing test data");
      for (let i = 0; i < this.ffnnTestDatas.length; i++) {
        this.ffnnTestDatas[i][0]
          .sub(mean)
          .div(Matrix.map(std, (x) => x + EPSILON));
      }
    }
  }

  /**
   * Makes predictions on the canvas input using FFNN and CNN and sets component state.
   */
  handlePredict = () => {
    if (this.ffnn !== undefined && this.cnn !== undefined) {
      const inputArr = this.canvasRef.current.predict();
      const ffnnInput = Matrix.vectorFromArray(inputArr);
      const cnnInput = Matrix.matrixFromArray(inputArr, 28, 28);

      if (USE_STANDARDIZATION) {
        ffnnInput
          .sub(this.ffnn.trainMean)
          .div(Matrix.map(this.ffnn.trainSTD, (x) => x + EPSILON));
      }

      const ffnnOutputArr = this.ffnn.predict(ffnnInput);
      const ffnnPred = ffnnOutputArr.indexOf(Math.max(...ffnnOutputArr));

      const cnnOutputArr = this.cnn.predict(cnnInput);
      const cnnPred = cnnOutputArr.indexOf(Math.max(...cnnOutputArr));

      // Update state about prediction and displayed probabilities
      this.setState({
        ffnnOutputArr,
        cnnOutputArr,
        ffnnPred,
        cnnPred,
      });
    }
  };

  /**
   * Clears the canvas and resets component state.
   */
  handleClear = () => {
    this.canvasRef.current.erase();

    this.setState({
      ffnnOutputArr: [],
      cnnOutputArr: [],
      ffnnPred: "",
      cnnPred: "",
    });
  };

  render() {
    const sampleImages = [];
    for (let i = 0; i < 10; i++) {
      const cols = [];

      for (let j = 0; j < NUM_MNIST_SAMPLES; j++) {
        const col = (
          <div className="col-auto" key={`col-${i}-${j}`}>
            <canvas
              id={`canvas-${i}-${j}`}
              width="28"
              height="28"
              style={{
                border: "2px solid aquamarine",
                borderRadius: "5px",
                backgroundColor: "white",
              }}
            ></canvas>
          </div>
        );
        cols.push(col);
      }

      const row = (
        <div className="row justify-content-center" key={`row-${i}`}>
          {cols}
        </div>
      );
      sampleImages.push(row);
    }

    const ffnnProbs = [];
    for (let i = 0; i < 10; i++) {
      const prob = (
        <div className="row" key={"fnn" + i}>
          <div className="col text-right">
            <h5>{i}:</h5>
          </div>
          <div className="col text-left">
            <h5>
              {this.state.ffnnOutputArr.length > 0
                ? (this.state.ffnnOutputArr[i] * 100).toFixed(1) + "%"
                : ""}
            </h5>
          </div>
        </div>
      );
      ffnnProbs.push(prob);
    }
    const cnnProbs = [];
    for (let i = 0; i < 10; i++) {
      const prob = (
        <div className="row" key={"cnn" + i}>
          <div className="col text-right">
            <h5>{i}:</h5>
          </div>
          <div className="col text-left">
            <h5>
              {this.state.cnnOutputArr.length > 0
                ? (this.state.cnnOutputArr[i] * 100).toFixed(1) + "%"
                : ""}
            </h5>
          </div>
        </div>
      );
      cnnProbs.push(prob);
    }

    return (
      <div className="App container text-center py-5">
        <div className="row">
          <div className="col">
            <h1 className="font-weight-bold">Digit Recognizer</h1>
            <h5>
              Recognizes user-drawn digits using self-implemented feedforward
              (FFNN) and convolutional (CNN) neural networks.
              <br />
              Draw a number from 0 to 9 and see if the networks can predict your
              number!
            </h5>
            <h3 className="pt-3">MNIST Samples:</h3>
            {sampleImages}
            <div className="row justify-content-center pt-4">
              <div className="col-4 col-md-3 col-xl-2">
                <Button value="Predict" onClick={this.handlePredict} />
              </div>
              <div className="col-4 col-md-3 col-xl-2">
                <Button value="Clear" onClick={this.handleClear} />
              </div>
            </div>
            <div className="pt-4">
              <Canvas ref={this.canvasRef} />
            </div>
            <canvas
              id="canvas28"
              width="28"
              height="28"
              style={{
                border: "2px solid aquamarine",
                borderRadius: "5px",
                backgroundColor: "white",
              }}
            ></canvas>
            <div className="row justify-content-center">
              <div className="col-6 col-md-4 col-lg-3">
                <div className="row">
                  <div className="col text-right">
                    <h4 className="font-weight-bold">FFNN:</h4>
                  </div>
                  <div className="col text-left">
                    <h4 className="font-weight-bold">{this.state.ffnnPred}</h4>
                  </div>
                </div>
                {ffnnProbs}
              </div>
              <div className="col-6 col-md-4 col-lg-3">
                <div className="row font-weight-bold">
                  <div className="col text-right">
                    <h4 className="font-weight-bold">CNN:</h4>
                  </div>
                  <div className="col text-left">
                    <h4 className="font-weight-bold">{this.state.cnnPred}</h4>
                  </div>
                </div>
                {cnnProbs}
              </div>
            </div>
          </div>
        </div>
        <GithubCorner
          href="https://github.com/ryantran2165/digit-recognizer"
          bannerColor="#222"
          octoColor="#7fffd4"
          target="_blank"
        />
      </div>
    );
  }
}

export default App;
