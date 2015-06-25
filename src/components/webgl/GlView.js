import THREE from 'three'
import TWEEN from 'tween.js'
import Detector from './deps/Detector.js'

import Cycle from 'cycle-react'
import React from 'react'
let Rx = Cycle.Rx
let fromEvent = Rx.Observable.fromEvent
let merge = Rx.Observable.merge
let combineLatest = Rx.Observable.combineLatest
import combineTemplate from 'rx.observable.combinetemplate'
Rx.config.longStackSupport = true


import {windowResizes,pointerInteractions,pointerInteractions2,preventScroll} from '../../interactions/interactions'
import Selector from './deps/Selector'
import {getCoordsFromPosSizeRect} from './deps/Selector'
import {preventDefault,isTextNotEmpty,formatData,exists} from '../../utils/obsUtils'

import OrbitControls from './deps/OrbitControls'
import CombinedCamera from './deps/CombinedCamera'
import TransformControls from './transforms/TransformControls'

import helpers from 'glView-helpers'

let LabeledGrid = helpers.grids.LabeledGrid
let ShadowPlane = helpers.planes.ShadowPlane
let CamViewControls= helpers.CamViewControls
let annotations = helpers.annotations

let ZoomInOnObject= helpers.objectEffects.ZoomInOnObject

import {selectionAt,meshFrom,isTransformTool,targetObject,
  makeCamera, makeControls, makeLight
} from './utils2'

/*TODO:
- remove any "this", adapt code accordingly 
- extract reusable pieces of code
- remove any explicit "actions" like showContextMenu$, hideContextMenu$ etc
- streamline all interactions
*/
////////////
function _GlView(interactions, props, self){
  let config = {
    renderer:{
      shadowMapEnabled:true,
      shadowMapAutoUpdate:true,
      shadowMapSoft:true,
      shadowMapType : undefined,//THREE.PCFSoftShadowMap,//THREE.PCFSoftShadowMap,//PCFShadowMap 
      autoUpdateScene : true,//Default ?
      physicallyBasedShading : false,//Default ?
      autoClear:true,//Default ?
      gammaInput:false,
      gammaOutput:false
    },
    cameras:[
      {
        name:"mainCamera",
        pos:[75,75,145] ,//[100,-100,100]
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
        up:[0,0,1],
        rotateSpeed:2.0,
        panSpeed:2.0,
        zoomSpeed:2.0,
        autoRotate:{
          enabled:false,
          speed:0.2
        },
        _enabled:true,
        _active:true,
      }
    ],
    scenes:{
      "main":[
        //{ type:"hemisphereLight", color:"#FFFF33", gndColor:"#FF9480", pos:[0, 0, 500], intensity:0.6 },
        { type:"hemisphereLight", color:"#FFEEEE", gndColor:"#FFFFEE", pos:[0, 1200, 1500], intensity:0.8 },
        { type:"ambientLight", color:"#0x252525", intensity:0.03 },
        { type:"directionalLight", color:"#262525", intensity:0.2 , pos:[150,150,1500], castShadow:true, onlyShadow:true}
        //{ type:"directionalLight", color:"#FFFFFF", intensity:0.2 , pos:[150,150,1500], castShadow:true, onlyShadow:true}
      ],
      "helpers":[
        {type:"LabeledGrid"}
      ]
    }
  }

  let container$ = interactions.get("#container","ready")

  let initialized$ = interactions.subject('initialized').startWith(false) //.get('initialized','click').startWith(false)
  let update$ = Rx.Observable.interval(16)
  //let reRender$ = Rx.Observable.just(0) //Rx.Observable.interval(16) //observable should be the merger of all observable that need to re-render the view?

  let items$  = props.get('items').startWith([])
  let activeTool$ = props.get('activeTool')//.startWith("translate")
  let selections$ = props.get('selections').startWith([]).filter(exists).distinctUntilChanged()
  //every time either activeTool or selection changes, reset/update transform controls


  let renderer = null
  let zoomInOnObject = null
  let sphere =null

  let scene = new THREE.Scene()
  let dynamicInjector = new THREE.Object3D()//all dynamic mapped objects reside here
  scene.add( dynamicInjector )

  let camera   = makeCamera(config.cameras[0])
  let controls = makeControls(config.controls[0])
  let transformControls = new TransformControls( camera )


  let grid        = new LabeledGrid(200, 200, 10, config.cameras[0].up)
  let shadowPlane = new ShadowPlane(2000, 2000, null, config.cameras[0].up) 

  zoomInOnObject = new ZoomInOnObject()

  let windowResizes$ = windowResizes(1) //get from intents/interactions ?
  let {singleTaps$, doubleTaps$, contextTaps$, 
      dragMoves$, zoomIntents$} =  pointerInteractions2(interactions)

  contextTaps$ = contextTaps$.shareReplay(1)


  function withPickingInfos(inStream, windowResizes$ ){
    let clientRect$ = inStream
      .map(e => e.target)
      .map(target => target.getBoundingClientRect())

    return inStream
      .withLatestFrom(
        clientRect$,
        windowResizes$,
        function(event, clientRect, resizes){
          //console.log("clientRect",clientRect,event, resizes)
          //return {pos:{x:event.clientX,y:event.clientY},rect:clientRect,width:resizes.width,height:resizes.height}
          let data = {pos:{x:event.clientX,y:event.clientY},rect:clientRect,width:resizes.width,height:resizes.height,event}

          let mouseCoords = getCoordsFromPosSizeRect(data)
          return selectionAt(event, mouseCoords, camera, scene.children)
        }
      )
  }

  
  let _singleTaps$ = withPickingInfos(singleTaps$, windowResizes$)

  let _doubleTaps$ = withPickingInfos(doubleTaps$, windowResizes$)

  let _contextTaps$ = withPickingInfos(contextTaps$, windowResizes$).map( meshFrom )

  //problem : this fires BEFORE the rest is ready
  //we modify the transformControls mode based on the active tool
  activeTool$.skip(1).filter(isTransformTool).subscribe(transformControls.setMode)


  //hack/test
  let selections2$ = _singleTaps$.map( meshFrom )
    //.map(function(data){console.log("data",data);return data})
  let activeTool2$ = _contextTaps$.map("translate").scan(function (acc, x) { 
    if(acc === 'translate') return 'rotate'
    if(acc === 'rotate') return 'scale'
    if(acc === 'scale') return undefined
      return 'translate'
     }
  )
 
  //every time either activeTool or selection changes, reset/update transform controls
  let foo$ = combineTemplate({
    tool:activeTool2$,  //.filter(isTransformTool)),
    selections:selections2$
  })
    //.scan(function (acc, x) { return acc + x; })
    //.sample( initialized$.filter( x => x===true) ) //skipUntil ??//Rx.Observable.timer(1000) )//initialized$)
    .subscribe( 
      function(data){
        let {tool,selections} = data
        console.log("data",data, tool, selections)
        transformControls.detach()

        if(tool && selections)
        {
          transformControls.attach(sphere)
          transformControls.setMode(tool)
        }
        
      } 
      ,(err)=>console.log("error in stuff",err)
    )


  /*singleTaps$.subscribe(event => console.log("singleTaps"))
  doubleTaps$.subscribe(event => console.log("multiTaps"))
  contextTaps$.subscribe(event => console.log("contextTaps"))
  dragMoves$.subscribe(event => console.log("dragMoves"))
  zoomIntents$.subscribe(event => console.log("zoomIntents"))*/

  //singleTaps$ = pointerInteractions( container ).singleTaps$.map( selectionAt )
  //singleTaps$ = singleTaps$.map( selectionAt ) //stream of taps + selected meshes

  //extract the object & position from a pickingInfo data
  function objectAndPosition(pickingInfo){
    return {object:pickingInfo.object,point:pickingInfo.point}
  }
  /*_doubleTaps$
    .map(e => e.detail.pickingInfos.shift())
    .filter(exists)
    .map( objectAndPosition )
    .subscribe( (oAndP) => zoomInOnObject.execute( oAndP.object, {position:oAndP.point} ) )*/

  /*contextTaps$ = contextTaps$ //handle context menu type interactions
    .map( selectionAt )
    .map( selectMeshes )
    .map( positionFromCoords )

  //handle all the cases where events require removal of context menu
  //ie anything else but context
  let stopContext$ = merge(singleTaps$, doubleTaps$, dragMoves$)//, zoomIntents$)
    .take(1)
    .repeat()
  selectedMeshes$ = singleTaps$.map( selectionAt ) //still needed ?
  */

  let selectionsTransforms$ = fromEvent(transformControls, 'objectChange')
      .map(targetObject)

  //hande all the cases where events require re-rendering
  let reRender$ = merge(
    //ready$,
    //fromEvent(controls,'change'),
    update$
    //Rx.Observable.timer(200, 100).map(2).take(3)
    //fromEvent(controls,'change'), 
    //fromEvent(transformControls,'change'), 
    //fromEvent(camViewControls,'change'),
    //selectedMeshes$, 
    //selectionsTransforms$
    )
    .shareReplay(1)
  

  //reRender$.subscribe( () => console.log("reRender"), (err)=>console.log("error in reRender",err))
  //fromEvent(controls,'change').subscribe( () => console.log("reRender"), (err)=>console.log("error in reRender",err))
  //actual 3d stuff

  function setupScene(){
    var light = new THREE.PointLight(0xffffff)
    light.position.set(0,250,0)
    scene.add(light)

    var sphereGeometry = new THREE.SphereGeometry( 20, 32, 16 ) 
    var sphereMaterial = new THREE.MeshLambertMaterial( {color: 0x8888ff} );
    sphere = new THREE.Mesh(sphereGeometry, sphereMaterial)
    sphere.position.set(0, 0, -0)
    sphere.geometry.computeBoundingSphere()
    sphere.selectTrickleUp = false 
    sphere.selectable = true
    scene.add(sphere)


    for( let light of config.scenes["main"])
    {
      scene.add( makeLight( light ) )
    }
  }
    
  function render(scene, camera){
    renderer.render( scene, camera )
  }

  function update(){
    controls.update()
    transformControls.update()
    //if(this.camViewControls) this.camViewControls.update()
  }


  function configure (container){
    console.log("initializing into container", container)

    if(!Detector.webgl){
      //renderer = new CanvasRenderer() 
    } else {
      renderer = new THREE.WebGLRenderer( {antialias:false} )
    }

    renderer.setClearColor( "#fff" )
    Object.keys(config.renderer).map(function(key){
      //TODO add hasOwnProp check
      renderer[key] = config.renderer[key]
    })

    let pixelRatio = window.devicePixelRatio || 1
    renderer.setPixelRatio( pixelRatio )

    container.appendChild( renderer.domElement )

    controls.setDomElement( container )
    controls.addObject( camera )

    transformControls.setDomElement( container )
    transformControls.attach(sphere)

    //not a fan
    zoomInOnObject.camera = camera

    scene.add(camera)
    scene.add(grid)
    scene.add(shadowPlane)

    scene.add(transformControls)

  }

  function handleResize (sizeInfos){
    console.log("setting size",sizeInfos)
    let {width,height,aspect} = sizeInfos
  
    if(width >0 && height >0 && camera && renderer){
      renderer.setSize( width, height )
      camera.aspect = aspect
      camera.updateProjectionMatrix()   
      camera.setSize(width,height)

      //self.composer.reset()
      let pixelRatio = window.devicePixelRatio || 1
      //self.fxaaPass.uniforms[ 'resolution' ].value.set (1 / (width * pixelRatio), 1 / (height * pixelRatio))
      //self.composer.setSize(width * pixelRatio, height * pixelRatio)
    }
  }

  ///////////
  setupScene()

  //preventScroll(container)
  interactions.get('canvas', 'contextmenu').subscribe( e => preventDefault(e) )
  windowResizes$.subscribe(  handleResize  )
  update$.subscribe( update )


  //for now we use refs, but once in cycle, we should use virtual dom widgets & co
  let style = {width:"100%",height:"100%"}
  let overlayStyle ={position:'absolute',top:10,left:10}
  let vtree$ =  Rx.Observable.combineLatest(
    reRender$,
    initialized$,
    activeTool$,
    function(reRender, initialized, activeTool){

      if(!initialized && self.refs.container!==undefined){
        configure(self.refs.container.getDOMNode())
        //set the inital size correctly
        handleResize({width:window.innerWidth,height:window.innerHeight,aspect:window.innerWidth/window.innerHeight})

        interactions.getEventSubject('initialized').onEvent(true)
        initialized = true
      }

      if(initialized){
        render(scene,camera)
        TWEEN.update(reRender)
      }

      return ()=> (
      <div className="glView" style={style} >
        <div className="container" ref="container" autofocus/>  
        <div className="camViewControls" />

        <div className="overlayTest" style={overlayStyle}>
          {reRender} {initialized}
          <div>

          </div>
        </div>
      </div>)
    })

  return {
    view: vtree$,
    events:{
      initialized:initialized$,

      singleTaps$,
      doubleTaps$,

      contextTaps$,

      selectionsTransforms$,
      /*stopContext$,

      selectedMeshes$,//is this one needed or redundant ?
      */

    }
  }
}


let GlView = Cycle.component('GlView', _GlView, {bindThis: true})

export default GlView