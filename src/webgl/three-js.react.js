import React from 'react';
import THREE from 'three';
import Detector from './deps/Detector.js';

//import CanvasRenderer from './deps/CanvasRenderer';
import OrbitControls from './deps/OrbitControls';
import CombinedCamera from './deps/CombinedCamera';
//import registerReact from 'reactive-elements';

import PreventScrollBehaviour from '../behaviours/preventScrollBe'


console.log("THREE in gl view",THREE)

class ThreeJs extends React.Component{
  constructor(props){
    super(props);
    console.log("props", this.props);

    this.props= {width:0,height:0};
    this.scenes = {};

    //shoud be props ?
    this.config = {
      renderer:{
        shadowMapEnabled:true,
        shadowMapAutoUpdate:true,
        shadowMapSoft:true,
        shadowMapType : THREE.PCFSoftShadowMap,//THREE.PCFShadowMap; 
        autoUpdateScene : true,
        physicallyBasedShading : false,
      },
      viewports:[
        {
          name:"bla",
        }
      ],
      cameras:[
        {
          name:"bla",
          pos:[100,-100,100],
          up:[0,0,1],
          lens:{
            fov:45,
            near:0.1,
            far:20000,
          }
        }
      ],
      controls:[
        {
          rotateSpeed:2.0,
          panSpeed:2.0,
          zoomSpeed:2.0,
          autoRotate:{
            enabled:false,
            speed:4.0
          },
          _enabled:true,
          _active:true,
        }
      ],
      scenes:{
        "main":[
          { type:"hemisphereLight", color:"#FFFFEE", gndColor:"#FFFFEE", pos:[0, 1200, 1500], intensity:0.6 },
          //{ type:"hemisphereLight", color:"#FFFF33", gndColor:"#FF9480", pos:[0, 0, 500], intensity:0.6 },
          { type:"ambientLight", color:"#0x252525", intensity:0.03 },
          { type:"directionalLight", color:"#262525", intensity:0.2 , pos:[150,150,1500], castShadow:true, onlyShadow:true}
        ]
      }
    };

    this.state={cameras : this.config.cameras };
    //var div = this.refs.episode.getDOMNode();
  }
  
  componentDidMount(){
    this.scene = new THREE.Scene();
    let renderer = null;
    
    if(!Detector.webgl){
      //Detector.addGetWebGLMessage();
      //renderer = new CanvasRenderer(); 
    } else {
      renderer = new THREE.WebGLRenderer( {antialias:true} );
    }
    renderer.setClearColor( 0xffffff );
    renderer.shadowMapEnabled = this.config.renderer.shadowMapEnabled;
    renderer.shadowMapAutoUpdate = this.config.renderer.shadowMapAutoUpdate;
    //renderer.shadowMapSoft = this.config.renderer.shadowMapSoft;
    renderer.shadowMapType = this.config.renderer.PCFSoftShadowMap;//THREE.PCFShadowMap; 
    renderer.autoUpdateScene = this.config.renderer.autoUpdateScene;
    renderer.physicallyBasedShading = this.config.renderer.physicallyBasedShading;

    this._makeCamera(this.config.cameras[0]);
    
    let container = this.refs.container.getDOMNode();
    container.appendChild( renderer.domElement );
    this.container = container;
    
    this._makeControls(this.config.controls[0]);

    for( let light of this.config.scenes["main"])
    {
      this._makeLight( light );
    }
    //his._makeLight(this.config.scenes["main"][0]);
    //this._makeLight(this.config.scenes["main"][1]);

    //TODO: for testing, remove
    //this._makeTestStuff();
    
    this.renderer = renderer;
    this._animate();
    this.resizeHandler();
    
    window.addEventListener("resize", this.resizeHandler.bind(this) );
    
    container.addEventListener( "click", this.projectClick.bind(this), false );

    //this.domElement.addEventListener( "mousedown", onPointerDown, false );

    PreventScrollBehaviour.attach( container );
  }
  
  componentWillUnmount() {
      window.removeEventListener("resize", this.resizeHandler);
      //container.removeEventListener("click",this.projectClick)
      PreventScrollBehaviour.detach( );
  }
  
  shouldComponentUpdate(){
    //console.log("gne",this.props.cubeRot);
    //this.cube.rotation.z = this.props.cubeRot.rot.z;
    return false;
  }
  
  
  //internal stuff
  mapDataToVisual( data, visual ){
  }
  
  resizeHandler(){
    console.log("setting size");
    let width  = window.innerWidth
    let height = window.innerHeight;	
    let aspect = width/height;
    
    this.renderer.setSize(width, height);
    this.camera.aspect = aspect;
  }
  
  _makeTestStuff( ){
    let scene = this.scene;
    var geometry = new THREE.SphereGeometry( 30, 32, 16 );
    var material = new THREE.MeshLambertMaterial( { color: 0x000088 } );
    var mesh = new THREE.Mesh( geometry, material );
    mesh.position.set(0,40,0);
    //scene.add(mesh);

    var cubeGeometry = new THREE.BoxGeometry( 10, 10, 10, 1, 1, 1 );
	  //var cube = new THREE.Mesh( cubeGeometry, new THREE.MeshNormalMaterial() );
    var cube = new THREE.Mesh( cubeGeometry, new THREE.MeshBasicMaterial({color:0xff0000}) );
    //scene.add(cube);
    mesh.position.set(0,0,100);
    
    /*var light = new THREE.PointLight(0xffffff);
    light.position.set(0,0,100);

    scene.add(light);
    var ambientLight = new THREE.AmbientLight(0x111111);
    scene.add(ambientLight);*/

    console.log("scene",this.scene)
	  this.cube = cube;


    var hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.6 );
        hemiLight.color.setHSL( 0.6, 1, 0.6 );
        hemiLight.groundColor.setHSL( 0.095, 1, 0.75 );
        hemiLight.position.set( 0, 0, 500 );
        //scene.add( hemiLight );

        //
        var dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
        dirLight.color.setHSL( 0.1, 1, 0.95 );
        dirLight.position.set( -1, 1, 1.75 );
        dirLight.position.multiplyScalar( 50 );
        //scene.add( dirLight );

        dirLight.castShadow = true;

        dirLight.shadowMapWidth = 2048;
        dirLight.shadowMapHeight = 2048;

        var d = 50;

        dirLight.shadowCameraLeft = -d;
        dirLight.shadowCameraRight = d;
        dirLight.shadowCameraTop = d;
        dirLight.shadowCameraBottom = -d;

        dirLight.shadowCameraFar = 3500;
        dirLight.shadowBias = -0.0001;
        dirLight.shadowDarkness = 0.35;
        //dirLight.shadowCameraVisible = true;

        var groundGeo = new THREE.PlaneBufferGeometry( 10000, 10000 );
        var groundMat = new THREE.MeshPhongMaterial( { color: 0xffffff, specular: 0x050505 } );
        groundMat.color.setHSL( 0.095, 1, 0.75 );

        var ground = new THREE.Mesh( groundGeo, groundMat );
        //ground.rotation.x = -Math.PI/2;
        ground.position.z = -33;
        scene.add( ground );

        ground.receiveShadow = true;

  }
  
  /*setup a camera instance from the provided data*/
  _makeCamera( cameraData ){
    let cameraData = cameraData;//TODO: merge with defaults using object.assign
    let aspect = window.innerWidth/window.innerHeight;
    
    let camera = new THREE.PerspectiveCamera( cameraData.lens.fov, 
      aspect, cameraData.lens.near, cameraData.lens.far );

    camera = new CombinedCamera(
          window.innerWidth,
          window.innerHeight,
          cameraData.lens.fov,
          cameraData.lens.near,
          cameraData.lens.far,
          cameraData.lens.near,
          cameraData.lens.far);
    camera.up.fromArray( cameraData.up );  
    camera.position.fromArray( cameraData.pos );
    camera.lookAt(this.scene.position);	

    //FIXME: hack
    this.camera = camera ;
	  this.scene.add( camera );
    
    return camera;
  }
  
  
   /*setup a controls instance from the provided data*/
  _makeControls( controlsData ){
    let controlsData = controlsData;//TODO: merge with defaults using object.assign
    let controls = new OrbitControls(this.camera, this.container,new THREE.Vector3(0,0,1));
    controls.setDomElement( this.container );
    controls.addObject( this.camera );
    controls.upVector = new THREE.Vector3(0,0,1);
    
    controls.userPanSpeed = controlsData.panSpeed;
    controls.userZoomSpeed = controlsData.zoomSpeed;
  	controls.userRotateSpeed = controlsData.rotateSpeed;

    controls.autoRotate = controlsData.autoRotate.enabled;
    controls.autoRotateSpeed = controlsData.autoRotate.speed;
    
    this.controls = controls;
    return controls;
  }

  _makeLight( lightData ){
    console.log("color")
    let light = undefined;
    const DEFAULTS ={
      color:"#FFF",
      intensity:1,
      pos: [0,0,0]
    };
    let lightData = Object.assign({}, DEFAULTS, lightData);

    switch(lightData.type){
      case "light":
         light = new THREE.Light(lightData.color);
         light.intensity = lightData.intensity;
      break;
      case "hemisphereLight":
        light =new THREE.HemisphereLight(lightData.color, lightData.gndColor, lightData.intensity);
      break;
      case "ambientLight":
        // ambient light does not have intensity, only color
        let newColor = new THREE.Color( lightData.color );
        newColor.r *= lightData.intensity;
        newColor.g *= lightData.intensity;
        newColor.b *= lightData.intensity;
        light = new THREE.AmbientLight( newColor )
      break;
      case "directionalLight":
        const dirLightDefaults = {
          castShadow:false,
          onlyShadow:false,

          shadowMapWidth:512,
          shadowMapHeight:256,
          shadowCameraLeft:-500,
          shadowCameraRight:500,
          shadowCameraTop:500,
          shadowCameraBottom:-500,
          shadowCameraNear: 1200,
          shadowCameraFar:5000,
          shadowCameraFov:50,
          shadowBias:0.0001,
          shadowDarkness:0.5,
          shadowCameraVisible:false
        };
        lightData = Object.assign({}, dirLightDefaults, lightData);
        light = new THREE.DirectionalLight( lightData.color, lightData.intensity );
      break;
      default:
        throw new Error("could not create light")
      break
    }

    light.position.fromArray( lightData.pos );

    this.scene.add( light );

    return light
  }

  projectClick(event) {
      
  }
  
  _animate() 
  {
    //console.log("this", this._render)
    requestAnimationFrame( this._animate.bind(this) );
	  this._render();		
	  this._update();
  }

  _update()
  {
	  // delta = change in time since last call (in seconds)
	  //var delta = clock.getDelta(); 
	  //controls.update();
	  //stats.update();
	  if(this.controls) this.controls.update();
  }
  
  _render() 
  {	
	  this.renderer.render( this.scene, this.camera );
  }

  render(){
    return (
      <div className="container" ref="container" />
    );
  }
  
}

//document.registerReact('three-js', ThreeJs);
export default ThreeJs