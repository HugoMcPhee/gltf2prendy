import reactLogo from "./assets/react.svg";
import "./App.css";
import "@babylonjs/loaders/glTF";

// import "./styles.css";
import stairyDetailModelFile from "./assets/places/stairy/stairy_detail.glb";

console.log("--------------------");
console.log("stairyDetailModelFile");
console.log(stairyDetailModelFile);
import React, { useRef, useState } from "react";
import {
  Engine,
  Scene,
  useBeforeRender,
  useClick,
  useHover,
} from "react-babylonjs";

import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import ModelLoaderStory from "./PlaceModel";

const DefaultScale = new Vector3(1, 1, 1);
const BiggerScale = new Vector3(1.25, 1.25, 1.25);

type SpinningBoxProps = {
  name: string;
  position: Vector3;
  hoveredColor: Color3;
  color: Color3;
};

const SpinningBox = (props: SpinningBoxProps) => {
  // access Babylon scene objects with same React hook as regular DOM elements
  const boxRef = useRef<Mesh>(null);

  const [clicked, setClicked] = useState(false);
  useClick(() => setClicked((clicked) => !clicked), boxRef);

  const [hovered, setHovered] = useState(false);
  useHover(
    () => setHovered(true),
    () => setHovered(false),
    boxRef
  );

  // This will rotate the box on every Babylon frame.
  const rpm = 5;
  useBeforeRender((scene) => {
    if (boxRef.current) {
      // Delta time smoothes the animation.
      var deltaTimeInMillis = scene.getEngine().getDeltaTime();
      boxRef.current.rotation.y +=
        (rpm / 60) * Math.PI * 2 * (deltaTimeInMillis / 1000);
    }
  });

  return (
    <box
      name={props.name}
      ref={boxRef}
      size={2}
      position={props.position}
      scaling={clicked ? BiggerScale : DefaultScale}
    >
      <standardMaterial
        name={`${props.name}-mat`}
        diffuseColor={hovered ? props.hoveredColor : props.color}
        specularColor={Color3.Black()}
      />
    </box>
  );
};

export const SceneWithSpinningBoxes = () => (
  <div>
    <ModelLoaderStory />
    {/* <Engine antialias adaptToDeviceRatio canvasId="babylon-canvas">
      <Scene>
        <arcRotateCamera
          name="camera1"
          target={Vector3.Zero()}
          alpha={Math.PI / 2}
          beta={Math.PI / 4}
          radius={8}
        />
        <hemisphericLight
          name="light1"
          intensity={0.7}
          direction={Vector3.Up()}
        />
        <SpinningBox
          name="left"
          position={new Vector3(-2, 0, 0)}
          color={Color3.FromHexString("#EEB5EB")}
          hoveredColor={Color3.FromHexString("#C26DBC")}
        />
        <SpinningBox
          name="right"
          position={new Vector3(2, 0, 0)}
          color={Color3.FromHexString("#C8F4F9")}
          hoveredColor={Color3.FromHexString("#3CACAE")}
        />
      </Scene>
    </Engine> */}
  </div>
);

export default function App() {
  return (
    <div className="App">
      <h1>Hello CodeSandbox</h1>
      <h2>Start editing to see some magic happen!</h2>
      <SceneWithSpinningBoxes />
    </div>
  );
}
