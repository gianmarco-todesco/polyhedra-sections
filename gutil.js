"use strict";

// helper function: create world axes and return their pivot
function showWorldAxis(size, scene) {
    var makeTextPlane = function(text, color, size) {
        var dynamicTexture = new BABYLON.DynamicTexture("DynamicTexture", 50, scene, true);
        dynamicTexture.hasAlpha = true;
        dynamicTexture.drawText(text, 5, 40, "bold 36px Arial", color , "transparent", true);
        var plane = BABYLON.Mesh.CreatePlane("TextPlane", size, scene, true);
        plane.material = new BABYLON.StandardMaterial("TextPlaneMaterial", scene);
        plane.material.backFaceCulling = false;
        plane.material.specularColor = new BABYLON.Color3(0, 0, 0);
        plane.material.diffuseTexture = dynamicTexture;
        return plane;
    };
    var axisX = BABYLON.Mesh.CreateLines("axisX", [ 
      BABYLON.Vector3.Zero(), new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, 0.05 * size, 0), 
      new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, -0.05 * size, 0)
      ], scene);
    axisX.color = new BABYLON.Color3(1, 0, 0);
    var xChar = makeTextPlane("X", "red", size / 10);
    xChar.position = new BABYLON.Vector3(0.9 * size, -0.05 * size, 0);
    var axisY = BABYLON.Mesh.CreateLines("axisY", [
        BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3( -0.05 * size, size * 0.95, 0), 
        new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3( 0.05 * size, size * 0.95, 0)
        ], scene);
    axisY.color = new BABYLON.Color3(0, 1, 0);
    var yChar = makeTextPlane("Y", "green", size / 10);
    yChar.position = new BABYLON.Vector3(0, 0.9 * size, -0.05 * size);
    var axisZ = BABYLON.Mesh.CreateLines("axisZ", [
        BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3( 0 , -0.05 * size, size * 0.95),
        new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3( 0, 0.05 * size, size * 0.95)
        ], scene);
    axisZ.color = new BABYLON.Color3(0, 0, 1);
    var zChar = makeTextPlane("Z", "blue", size / 10);
    zChar.position = new BABYLON.Vector3(0, 0.05 * size, 0.9 * size);
    let pivot = new BABYLON.TransformNode('axes', scene);
    [axisX,axisY,axisZ,xChar,yChar,zChar].forEach(entity=>entity.setParent(pivot));
    return pivot;

};


// place a standard cylinder along vStart-vEnd segment and set its radius to r
function placeCylinder(cylinder, vStart, vEnd, r) {
    const distance = BABYLON.Vector3.Distance(vStart,vEnd )
    BABYLON.Vector3.LerpToRef(vStart,vEnd,0.5,cylinder.position)       
    cylinder.scaling.set(r,distance,r)

    const delta = vEnd.subtract(vStart).scale(1.0/distance)
    const up = new BABYLON.Vector3(0, 1, 0)
    let angle = Math.acos(BABYLON.Vector3.Dot(delta, up));
    let quaternion
    if(Math.abs(angle) > 0.00001) {
        const axis = BABYLON.Vector3.Cross( up, delta).normalize()
        quaternion = BABYLON.Quaternion.RotationAxis(axis, angle);    
    } else quaternion = BABYLON.Quaternion.Identity()
    cylinder.rotationQuaternion = quaternion
}



// helper function: HSV => RGB
function HSVtoRGB(h, s, v) {
    var r, g, b, i, f, p, q, t;
    if (arguments.length === 1) {
        s = h.s, v = h.v, h = h.h;
    }
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    return [r,g,b,1.0];
}


// a polyhedron made of spheres (vertices), cylinders (edges) and triangles (faces)
class GeometricModel {
    constructor(name, scene) {
        this.name = name
        this.scene = scene
        let pivot = this.pivot = new BABYLON.TransformNode(name+"-pivot", scene)

        let dot = this.dot = BABYLON.MeshBuilder.CreateSphere(name+'-dot', {diameter:2}, scene)
        let mat = dot.material = new BABYLON.StandardMaterial(name+'dot-mat', scene)
        mat.diffuseColor.set(0.6,0.1,0.7)
        dot.parent = pivot
        this.vertices = [dot]
        dot.visibility = 0
        this.usedVertices = 0

        let edge = this.edge = BABYLON.MeshBuilder.CreateCylinder(name+'-edge', {diameter:2, height:1}, scene)
        mat = edge.material = new BABYLON.StandardMaterial(name+'edge-mat', scene)
        mat.diffuseColor.set(0.6,0.6,0.6)
        edge.parent = pivot
        this.edges = [edge]
        edge.visibility = 0
        this.usedEdges = 0

        let facesMesh = this.facesMesh = new BABYLON.Mesh(name+'-faces', scene)
        facesMesh.parent = pivot
        mat = facesMesh.material = new BABYLON.StandardMaterial(name+'faces-mat', scene)
        mat.backFaceCulling = false
        mat.diffuseColor.set(0.6,0.8,0.2)
        // mat.alpha = 0.5
    }

    // call beginUpdate() before changing the polyhedron
    beginUpdate() {
        this.usedVertices = 0
        this.usedEdges = 0
        this.faces = { positions:[], indices:[], vCount:0, fCount:0 }
    }
    // call beginUpdate() after changing the polyhedron
    endUpdate() {
        this.dot.visibility = this.usedVertices == 0 ? 0 : 1
        let i
        i = this.vertices.length-1
        while(i>=this.usedVertices && i>0) this.vertices[i--].dispose()
        if(i+1<this.vertices.length) this.vertices.splice(i+1, this.vertices.length-(i+1))

        this.edge.visibility = this.usedEdges == 0 ? 0 : 1
        i = this.edges.length-1
        while(i>=this.usedEdges && i>0) this.edges[i--].dispose()
        if(i+1<this.edges.length) this.edges.splice(i+1, this.edges.length-(i+1))
 
        if(this.faces.fCount == 0) this.facesMesh.visibility = 0
        else {
            var vertexData = new BABYLON.VertexData();
            vertexData.positions = this.faces.positions
            vertexData.indices = this.faces.indices
            vertexData.applyToMesh(this.facesMesh);
            this.facesMesh.visibility = 1
        }

        // check
        const q = this.scene.meshes.filter(mesh=>mesh.name.startsWith(this.name + "-dot-inst"))
        if(this.usedVertices > 0) {
            if(this.usedVertices-1 != q.length) {

                console.log(q.length, this.usedVertices)
                throw "Bad! (1)"    
            }
        } else {
            if(q.length != 0) {
                console.log(q.length, this.usedVertices)
                throw "Bad! (2)"    

            }

        }
    }
    addVertex(pos, r) {
        let i = this.usedVertices++
        while(this.vertices.length <= i) {
            const name = this.name+'-dot-inst-'+this.vertices.length
            let instance = this.dot.createInstance(name)
            instance.parent = this.pivot
            this.vertices.push(instance)
        }
        const v = this.vertices[i]
        v.scaling.set(r,r,r)
        v.position.copyFrom(pos)
        return i        
    }
    addEdge(pa,pb,r) {
        let i = this.usedEdges++
        while(this.edges.length <= i) {
            const name = this.name+'-edge-inst-'+this.edges.length
            let instance = this.edge.createInstance(name)
            instance.parent = this.pivot
            this.edges.push(instance)
        }
        placeCylinder(this.edges[i], pa, pb, r)
        return i
    }
    addFace(pts) {
        const m = pts.length
        const k = this.faces.vCount
        const {positions, indices} = this.faces
        pts.forEach(p => { positions.push(p.x,p.y,p.z) })
        for(let i=2; i<m; i++) { indices.push(k, k+i-1, k+i) }
        this.faces.vCount += m
        this.faces.fCount ++
    }
}

class Polyhedron extends GeometricModel {
    constructor(name, data, scene) {
        super(name,scene);
        const scaleFactor = this.scaleFactor = 2;
        this.data = data;
        this.beginUpdate();
        let pts = this.data.vertices.map(v => v.scale(scaleFactor));
        pts.forEach(v => this.addVertex(v,0.03));
        this.data.edges.forEach(([a,b]) => this.addEdge(pts[a],pts[b],0.02));
        this.data.faces.forEach((f) => this.addFace(f.map(i=>pts[i])));
        this.endUpdate();
    }
}

function findLoops(links) {
    let touched = {};
    let loops = [];
    links.forEach(a => {
        if(!touched[a]) {
            let loop = [a];
        } 
    })
}

class PolyhedronSection extends GeometricModel {
    constructor(name, scene) {
        super(name,scene);
        this.data = { pts:[], edges:[] };
    }
    update(ph, plane) {
        this.data.pts = [];
        this.data.edges = [];
        this.beginUpdate();

        ph.pivot.computeWorldMatrix(true);                
        let pts = ph.vertices.map(v=>{ v.computeWorldMatrix(true); return v.getAbsolutePosition().clone();});
        const coords = pts.map(p=>plane.dotCoordinate(p));
        if(0.0 in coords) {
            let pos = coords.filter(z=>z>0.0);
            let eps = 1.0e-8;
            if(pos.length>0) {
                eps = Math.min(eps, 0.5 * Math.min(...pos));
            }
            coords.forEach((z,i)=>coords[i]=z+eps);
        }
        let newPts = [];
        let tb = {};
        ph.data.edges.forEach(([a,b])=>{
            const co_a = coords[a], co_b = coords[b];
            if(co_a*co_b<0.0) {
                const pa = pts[a]
                const pb = pts[b]
                let p = BABYLON.Vector3.Lerp(pa,pb,(-co_a)/(co_b-co_a));
                tb[a+','+b] = tb[b+','+a] = newPts.length;
                newPts.push(p);
                this.addVertex(p, 0.07);
                this.data.pts.push([p.x,p.z]);
            }            
        })
        let links = {};
        ph.data.faces.forEach((f,i)=> {
            let segment = []
            let a = f[f.length-1]
            f.forEach(b=>{
                let edgeId = a + "," + b;
                let newPtIdx = tb[edgeId];
                if(newPtIdx !== undefined) {
                    segment.push(newPtIdx);
                }
                a = b
            })
            if(segment.length==2) {
                const a = segment[0], b = segment[1];
                this.addEdge(newPts[a], newPts[b], 0.05);
                this.data.edges.push([a,b])
            } else if(segment.length==0) {

            } else {
                console.log(segment, coords)
            }
        }) 
        this.endUpdate();
    } 
};

// not used?
/*
class VertexDataBuilder {
    constructor() {
        this.vertexData = null
    }

    addXZPolygon(pts, y) {
        const positions = []
        const normals = []
        const indices = []
        const uvs = []
        let ny = y>=0 ? 1 : -1
        positions.push(0,y,0)
        normals.push(0,ny,0)
        uvs.push(0,0)
        pts.forEach(({x,z}) => {
            positions.push(x,y,z)
            normals.push(0,ny,0)
            uvs.push(0,0)
        })
        if(y>=0) {
            for(let i=0; i<pts.length; i++) indices.push(0, 1+i, 1+((i+1)%pts.length))        
        } else {
            for(let i=0; i<pts.length; i++) indices.push(0, 1+((i+1)%pts.length), 1+i)
        }
        const vd = new BABYLON.VertexData()
        vd.positions = positions
        vd.normals = normals
        vd.indices = indices
        vd.uvs = uvs
        this.merge(vd)        
    }
    merge(vd) {
        if(this.vertexData) this.vertexData.merge(vd)
        else this.vertexData = vd
    }
    addSphere(c,r) {
        const vd = BABYLON.VertexData.CreateIcoSphere({
            radius:r, 
            flat:false,
            subdivisions:4
         })
        vd.transform(BABYLON.Matrix.Translation(c.x,c.y,c.z))
        this.merge(vd)
    }
    addCylinder(pa,pb,r) {
        const dist = BABYLON.Vector3.Distance(pa,pb)
        const vd = BABYLON.VertexData.CreateCylinder({
            height:dist, 
            diameter:r*2,
            tessellation:16,
        })
        const delta = pb.subtract(pa)
        const rxz2 = delta.x*delta.x + delta.z*delta.z
        const matrix = new BABYLON.Matrix()
        matrix.setRowFromFloats(3, 
            (pa.x+pb.x)*0.5, 
            (pa.y+pb.y)*0.5, 
            (pa.z+pb.z)*0.5, 1)

        if(rxz2<1.0e-8)  { 
            matrix[0] = matrix[5] = matrix[10] = 1
        } else {
            const up = new BABYLON.Vector3(0,1,0)
            const e1 = delta.scale(1/dist)
            const e0 = BABYLON.Vector3.Cross(e1, up).normalize()
            const e2 = BABYLON.Vector3.Cross(e0,e1).normalize()
            matrix.setRowFromFloats(0, e0.x,e0.y,e0.z, 0)
            matrix.setRowFromFloats(1, e1.x,e1.y,e1.z, 0)
            matrix.setRowFromFloats(2, e2.x,e2.y,e2.z, 0)
        }
        vd.transform(matrix)
        this.merge(vd)
    }
    
}
*/
