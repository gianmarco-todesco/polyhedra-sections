"use strict";

let canvas, engine, scene, camera, model, section;
let clipPlane;

let sectionSlider, sectionPanel;


window.addEventListener('DOMContentLoaded', ()=> {
    addStyles();

    let mainContainer = document.getElementById('main-container');
    let guiPanel = document.createElement('div');
    guiPanel.classList.add('gui-panel');
    
    addButton(guiPanel, "Tetraedro", ()=>setModel(PolyhedronData.p4));
    addButton(guiPanel, "Cubo", ()=>setModel(PolyhedronData.p6));
    addButton(guiPanel, "Ottaedro", ()=>setModel(PolyhedronData.p8));
    addButton(guiPanel, "Dodecaedro", ()=>setModel(PolyhedronData.p12));
    addButton(guiPanel, "Icosaedro", ()=>setModel(PolyhedronData.p20));
    
    sectionSlider = document.createElement('input');
    sectionSlider.type = "range";
    guiPanel.appendChild(sectionSlider)
    sectionSlider.oninput = () => {
        console.log(sectionSlider.value);
        setSection(sectionSlider.value/100.0)
    }

    mainContainer.appendChild(guiPanel);

    let canvasContainer = document.createElement('div');
    canvasContainer.classList.add('view3d');
    mainContainer.appendChild(canvasContainer);

    canvas = document.createElement('canvas');
    canvasContainer.appendChild(canvas);
    
    canvasContainer = document.createElement('div');
    canvasContainer.classList.add('view2d');
    mainContainer.appendChild(canvasContainer);

    sectionPanel = document.createElement('canvas');
    canvasContainer.appendChild(sectionPanel);
    
        


    engine = new BABYLON.Engine(canvas, true, {deterministicLockstep: true})
    scene = new BABYLON.Scene(engine)
    scene.clearColor.set(1,1,1);
    camera = new BABYLON.ArcRotateCamera("Camera", 
        1.03, 1.45, 15, 
        new BABYLON.Vector3(0,0,0), scene)
    camera.attachControl(canvas, true)
    camera.wheelPrecision=20
    camera.lowerRadiusLimit = 5
    const light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1, 1, 0), scene)
    const light2 = new BABYLON.PointLight("light2", new BABYLON.Vector3(0, 0, 0), scene)
    light2.parent = camera

    populateScene()
    // createGui();
    // slide.axes = showWorldAxis(4, scene);

    scene.onKeyboardObservable.add(onKeyEvent);
    handlePointer()

    engine.runRenderLoop(() => scene.render())
    window.addEventListener("resize", ()=>engine.resize());
})


function cleanup() {
    window.removeEventListener("resize", onResize)
    engine.stopRenderLoop()    
    scene.dispose()
    engine.dispose()
    scene = null;
    engine = null;
}

function addButton(container, name, cb) {
    let btn = document.createElement('button');
    btn.innerHTML = name;
    btn.onclick = cb;
    container.appendChild(btn);
    return btn;
}

function handlePointer() {
    let status = 0
    let oldx, oldy
    scene.onPointerObservable.add(pointerInfo => {
        switch (pointerInfo.type) {
            case BABYLON.PointerEventTypes.POINTERDOWN:
                onpointerdown(pointerInfo)
                break
            case BABYLON.PointerEventTypes.POINTERUP:
                if(status != 0) onpointerup(pointerInfo)
                break
            case BABYLON.PointerEventTypes.POINTERMOVE:
                if(status != 0) onpointerdrag(pointerInfo)
                break
        }
    });
    function onpointerdown(pointerInfo) {
        //console.log(pointerInfo)
        if(pointerInfo.pickInfo.pickedMesh) {
            //console.log(pointerInfo.pickInfo.pickedMesh.name)
        }
        if(pointerInfo.event.offsetX<100) {
            status = 1
        } else if(pointerInfo.pickInfo.pickedMesh) {
            status = 2
        }
        if(status != 0) {
            oldx = pointerInfo.event.offsetX
            oldy = pointerInfo.event.offsetY
            setTimeout(() => camera.detachControl(canvas))
        }
    }
    function onpointerup(pointerInfo) {
        status = 0
        camera.attachControl(canvas, true); 
    }
    function onpointerdrag(pointerInfo) {
        let x = pointerInfo.event.offsetX
        let y = pointerInfo.event.offsetY
        let dx = x-oldx
        let dy = y-oldy
        oldx = x
        oldy = y
        if(status==1) {
            model.pivot.position.y -= dy*0.03
            // slide.model.update()
        }
        else if(status == 2) {
            rotateObject(dx,dy);
        }
        // if(slide.section) slide.section.doUpdate();
    }

}

function onKeyEvent(kbInfo) {
    switch (kbInfo.type) {
        case BABYLON.KeyboardEventTypes.KEYDOWN:
            console.log("KEY DOWN: ", kbInfo.event.key);
            const key = kbInfo.event.keyCode
            if(49<=key && key<=49+9) {
                let data 
                if(key == 49) data = PolyhedronData.p4
                else if(key == 50) data = PolyhedronData.p6
                else if(key == 51) data = PolyhedronData.p8
                else if(key == 52) data = PolyhedronData.p12
                else if(key == 53) data = PolyhedronData.p20
                else if(key == 56) data = PolyhedronData.pg20
                else break;
                setModel(data);
            } 
            else if(kbInfo.event.key == "f") 
                orientModel(slide.model.data.getFaceOrientation(0,0));
            else if(kbInfo.event.key == "v") 
                orientModel(slide.model.data.getVertexOrientation(0,1));
            else if(kbInfo.event.key == "e") 
                orientModel(slide.model.data.getEdgeOrientation(0));
            
            else if(kbInfo.event.key == "h") {
                if(slide.model.facesMesh.isVisible) hideModel();
                else showModel();
            }

            break;
        case BABYLON.KeyboardEventTypes.KEYUP:
            console.log("KEY UP: ", kbInfo.event.keyCode);
            break;
    }
}


        /*
        var glowLayer = this.glowLayer = new BABYLON.GlowLayer("glow", scene, { 
            mainTextureFixedSize: 256,
            blurKernelSize: 64
        });
        glowLayer.intensity = 2.0
        */


function rotateObject(dx,dy) {
    let obj = model.pivot;
    
    let cameraQuaternion = BABYLON.Quaternion.FromRotationMatrix(camera.getWorldMatrix().getRotationMatrix());
    let rotInCameraSpace = BABYLON.Quaternion.FromEulerAngles(-dy*0.01, -dx*0.01, 0);

    let q = cameraQuaternion.invert().multiply(obj.rotationQuaternion);
    q = rotInCameraSpace.multiply(q);
    obj.rotationQuaternion = cameraQuaternion.multiply(q);

}

function populateScene() {

    const paper = createPaper()
    clipPlane = new BABYLON.Plane(0,1,0,0);
    setModel(PolyhedronData.p6);

    section = new PolyhedronSection('section',scene);
    section.edge.material.diffuseColor.set(1,0,0);

    scene.onAfterStepObservable.add(function (theScene) { 
        if(model && section) {
            section.update(model, clipPlane);
            updateSectionPanel();
        }
    });

}

function linkButton(id, cb) {
    let btn = document.getElementById(id);
    if(btn) btn.onclick = cb;
}

function createGui() {
    let advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

    let panel = new BABYLON.GUI.StackPanel();
    panel.width = "50px";
    // panel.background = 'red'
    panel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    panel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
    advancedTexture.addControl(panel);

    /*
    let header = new BABYLON.GUI.TextBlock();
    header.text = "Y-rotation: 0 deg";
    header.height = "30px";
    header.color = "white";
    panel.addControl(header); 
    */

    var slider = sectionSlider = new BABYLON.GUI.Slider();
    slider.minimum = 0;
    slider.maximum = 1;
    slider.value = 0;
    slider.isVertical = true;
    slider.height = "200px";
    slider.width = "20px";
    slider.borderColor = 'black';
    slider.color = 'teal';
    slider.displayThumb = true;
    slider.isThumbCircle = true;
    slider.onValueChangedObservable.add(setSection);
    panel.addControl(slider);  


    panel = new BABYLON.GUI.StackPanel();
    panel.width = "150px";
    // panel.background = 'gray'
    panel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    panel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    advancedTexture.addControl(panel);

    let names = ["Tetraedro","Cubo","Ottaedro","Dodecaedro","Icosaedro"];
    let pdata = [PolyhedronData.p4,PolyhedronData.p6,PolyhedronData.p8,PolyhedronData.p12,PolyhedronData.p20];    
    names.forEach((name,i) => {
        let button = new BABYLON.GUI.RadioButton();
        button.width = "20px";
        button.height = "20px";
        button.color = "white";
        button.background = "green";   
        let pdata_i = pdata[i];
        button.onIsCheckedChangedObservable.add(state => {
            if(state) setModel(pdata_i)
        });
        let header = BABYLON.GUI.Control.AddHeader(button, name, "120px", { 
            isHorizontal: true, 
            controlFirst: true 
        });
        header.onPointerClickObservable.add(() => { button.isChecked=true; });
        header.height = "30px";
        panel.addControl(header);
    })

    panel = new BABYLON.GUI.StackPanel();
    panel.width = "150px";
    // panel.background = 'gray'
    panel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    panel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
    advancedTexture.addControl(panel);

    names = ["Vertice","Spigolo","Faccia"];
    let cb = [setVertexOrientation, setEdgeOrientation, setFaceOrientation];
    names.forEach((name,i) => {
        let button = BABYLON.GUI.Button.CreateSimpleButton("btn-"+i, name);
        button.width = "100px";
        button.height = "40px";
        button.color = "white";
        button.paddingBottom = "20px"
        button.background = "green";
        button.onPointerClickObservable.add(cb[i]);
        
        panel.addControl(button);  
    })



}


function setSectionRangeValue(param) {
    if(sectionSlider) sectionSlider.value = param;
}

function createPaper() {
    const w = 10, h = 8
    const t = 0.1

    const pivot = new BABYLON.Mesh('paper-pivot', scene)

    const plane = BABYLON.MeshBuilder.CreateGround("paper-ground", {
        width: w, height: h}, scene)
    const planeMat = plane.material = new BABYLON.StandardMaterial('paper-ground-mat', scene)
    planeMat.diffuseColor.set(0.5,0.7,0.9)
    planeMat.backFaceCulling = false
    planeMat.alpha = 0.5
    plane.parent = pivot
    plane.isPickable = false

    const borderMat = new BABYLON.StandardMaterial('paper-border-mat', scene)
    borderMat.diffuseColor.set(0.2,0.4,0.6)
    const box = BABYLON.MeshBuilder.CreateBox('paper-box', {size:t}, scene)
    box.parent = pivot
    box.material = borderMat
    const boxes = [box]
    for(let i = 1; i<8; i++) 
    {
        const inst = box.createInstance('paper-box-'+i)
        inst.parent = pivot
        boxes.push(inst)
    }
    const x = w/2, z = h/2
    
    boxes[0].position.set(-x,0,-z)
    boxes[1].position.set( x,0,-z)
    boxes[2].position.set(-x,0, z)
    boxes[3].position.set( x,0, z)
    

    boxes[4].position.set( 0,0,-z)
    boxes[5].position.set( 0,0, z)
    boxes[4].scaling.set(w/t-1,1,1)
    boxes[5].scaling.set(w/t-1,1,1)
    boxes[6].position.set(-x,0, 0)
    boxes[7].position.set( x,0, 0)
    boxes[6].scaling.set(1,1,h/t-1)
    boxes[7].scaling.set(1,1,h/t-1)
    

    return pivot
}


function setModel(data) {
    if(model) model.pivot.dispose();                
    model = new Polyhedron('a',data,scene);
    model.facesMesh.material.clipPlane = clipPlane;
    let r = model.data.vertices[0].length() * model.scaleFactor;
    model.radius = r;
    model.pivot.position.y = -r;
    model.pivot.rotationQuaternion = new BABYLON.Quaternion();
    setSectionRangeValue(0);
}

function orientModel(q) {
    let obj = model.pivot;
    let q0 = obj.rotationQuaternion ? obj.rotationQuaternion.clone() : new BABYLON.Quaternion();
    BABYLON.Animation.CreateAndStartAnimation('a', obj, "rotationQuaternion", 60, 60, q0,q, 
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
}

function hideModel() {
    slide.model.pivot.getChildren().forEach(itm => itm.isVisible = false);
}
function showModel() {
    slide.model.pivot.getChildren().forEach(itm => itm.isVisible = true);
}

function setSection(param) {
    let y = 0.0;
    if(model) y = model.radius * (-1 + param * 2);
    model.pivot.position.y = y;
}

function setVertexOrientation() {
    orientModel(model.data.getVertexOrientation(0,1));
}

function setEdgeOrientation() {
    orientModel(model.data.getEdgeOrientation(0));
}

function setFaceOrientation() {
    orientModel(model.data.getFaceOrientation(0,0));

}

function updateSectionPanel() {
    let ctx = sectionPanel.getContext('2d');
    let width = sectionPanel.width = sectionPanel.clientWidth;
    let height = sectionPanel.height = sectionPanel.clientHeight;
    ctx.clearRect(0,0,width,height);
    ctx.save();
    ctx.translate(width/2,height/2);
    let scaleFactor = width*0.05;
    let pts = section.data.pts.map(([x,y]) => [x*scaleFactor,y*scaleFactor]);
    const dotRadius = 2;
    if(section.data.pts.length>0) {
        if(section.data.edges.length>0) {
            ctx.beginPath();
            section.data.edges.forEach(([a,b]) => {
                ctx.moveTo(pts[a][0],pts[a][1]);
                ctx.lineTo(pts[b][0],pts[b][1]);                
            })
            ctx.strokeStyle = "black";
            ctx.stroke();
        }
        ctx.beginPath();
        pts.forEach(([x,y]) => {
            ctx.moveTo(x+dotRadius,y);
            ctx.arc(x,y,dotRadius,0, Math.PI*2);
        })
        ctx.fillStyle = "black";
        ctx.fill();
    }
    
    ctx.restore();
    

}



function addStyles() {
    
    let style = document.createElement('style');
    style.innerHTML = `
        #main-container {
            display:flex;
            flex-direction:row;
            border:solid 4px red;
            width:90%;
        }
        .gui-panel {
            width:150px;
            flex:initial;
        }
        .view3d {
            flex:1 1 0;
            border:solid 1px gray;    
            aspect-ratio:1;
            
        }
        .view2d {
            flex:1 1 0;           
            border:solid 1px gray;      
            aspect-ratio:1;
            
        }
        canvas {
            border:0;
            outline:none;
            width:100%;
            height:100%;
        }
    `;
    document.head.appendChild(style);
}
