import Rx from 'rx'
import {hasEntity,hasNoEntity,getEntity} from '../../utils/entityUtils'
import {first,toggleCursor} from '../../utils/otherUtils'
import {getXY} from '../../utils/uiUtils'




function dataFromMesh(objTransform$){
  function toArray (vec){
    return vec.toArray().slice(0,3)
  }

  return objTransform$
    .filter(hasEntity)
    .map(
      function(m){ 
        return {
          iuids:m.userData.entity.iuid, 
          pos:toArray(m.position),
          rot:toArray(m.rotation),
          sca:toArray(m.scale)
        } 
    })
    .shareReplay(1)
}

function hasClear(data){
  if(data && data.hasOwnProperty("clear")) return true
    return false
}


export function entityIntents(drivers){
  let glviewInit$ = interactions.get(".glview","initialized$")
  let shortSingleTaps$ = interactions.get(".glview","shortSingleTaps$")
  let shortDoubleTaps$ = interactions.get(".glview","shortDoubleTaps$")
  let contextTaps$ = interactions.get(".glview","longTaps$").pluck("detail")
    .map(function(e){
      if(!e) return undefined
      return getXY(e)
    }).startWith(undefined)

  let selectionTransforms$ = Rx.Observable.merge(
    //interactions.get(".glview","selectionsTransforms$").pluck("detail").filter(hasEntity)
    //  .map(function(m){ return {iuids:m.userData.entity.iuid, pos:m.position,rot:m.rot,sca:m.sca} })
    dataFromMesh( interactions.get(".glview","selectionsTransforms$").pluck("detail") )
    ,interactions.get(".entityInfos","selectionTransforms$").pluck("detail")
  )
  
  /*let absSize$ = interactions.get(".entityInfos","selectionTransforms$")
    .pluck("detail")
    .pluck("absSize")
    .subscribe(e=>console.log("selectionTransforms",e))*/
  //http://stack.gl/packages/#thibauts/rescale-vertices


  let contextMenuActions$ = interactions.get(".contextMenu", "actionSelected$").pluck("detail")
  let deleteInstances$     = contextMenuActions$.filter(e=>e.action === "delete").pluck("selections")
    .map(entities=> entities.map( e=>e.iuid) )
  let deleteAllInstances$  = contextMenuActions$.filter(e=>e.action === "deleteAll").pluck("selections")
  let duplicateInstances$  = contextMenuActions$.filter(e=>e.action === "duplicate").pluck("selections")

  //we need to "shut down the context menu after any click inside of it"
  contextTaps$ = contextTaps$.merge(
    contextMenuActions$.map(undefined)
  )

  deleteAllInstances$ = 
    deleteAllInstances$
    .merge(
      drivers.postMessages
      .filter(hasClear)
      .map(true)
    )

  //stand in for future use (circular depency problem !)
  let replaceAll$ = new Rx.Subject()

  return {
    
    selectionTransforms$

    ,contextTaps$

    ,deleteInstances$
    ,deleteAllInstances$
    ,duplicateInstances$

    ,replaceAll$
    
    /*addNote$,
    measureDistance$,
    measureThickness$,
    measureAngle$*/
  }
}


export function annotationIntents(interactions){
  let shortSingleTaps$ = interactions.get(".glview","shortSingleTaps$")
  //shortSingleTaps$.pluck("detail").subscribe(e=>console.log("FUUU",e.detail.pickingInfos[0].object.userData))

  let annotationCreationStep$ = shortSingleTaps$
    .pluck("detail")
    .map( (event)=>event.detail.pickingInfos)
    .filter( (pickingInfos)=>pickingInfos.length>0)
    .map(first)
    .share()  

  return {
    creationStep$ : annotationCreationStep$
  }
}