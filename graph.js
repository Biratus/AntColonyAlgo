class Graph {
    constructor(node_start) {
        this.start=node_start;
        this.trails=new Map();
    }

    addNode(node,from,next) {
        from.addNextNode([node]);
        node.addNextNode(next);
    }

    draw() {
        this.trails.forEach((v,k) => v.draw());
        for(let n of render_nodes) n.draw();
    }

    getTrail(node1,node2) {
        let code= codeFromPoints(node1,node2);

        return this.trails.get(code);        
    }

    generateTrails() {
        let currNodes=[this.start];
        let i=0
        while(i<10) {
            //Last Node
            if(currNodes.length==1 && currNodes[0].nextNodes.length==0) return;


            let nextNodes=[];
            for(let cn of currNodes) {
                for(let nn of cn.nextNodes) {
                    if(!nextNodes[nn.hashCode()]) nextNodes[nn.hashCode()]=nn; 
                    let code=codeFromPoints(cn,nn);
                    this.trails.set(code,new Trail(nn,cn));
                }

            }
            //nextNodes=nextNodes.filter(n => n!=null);
            currNodes=[];
            for(let i in nextNodes) {
                if(nextNodes[i]) currNodes.push(nextNodes[i]);
            }
            i++;
        }
    }

    highlightBest() {
        let trailTrace=[];
        let currNode=this.start;

        while(currNode.nextNodes.length>0) {
            let bestTrail=null;
            let bestNode=null;
            for(let n of currNode.nextNodes) {
                let t=this.getTrail(currNode,n);
                if(!bestTrail || t.pheromones>bestTrail.pheromones) {
                    bestTrail=t;
                    bestNode=n;
                }
            }
            trailTrace.push(bestTrail);
            currNode=bestNode;
        }
        for(let t of trailTrace) {
            stroke(255,0,255,150);
            strokeWeight(5);
            line(t.nodeA.pos.x,t.nodeA.pos.y,t.nodeB.pos.x,t.nodeB.pos.y);
        }
    }
}

var render_nodes=[];

class Node {

    constructor(x,y,render) {
        this.pos=createVector(x,y);

        this.color=[255,0,0];

        this.nextNodes=[];
        this.prevNodes=[];

        if(render==null || render) render_nodes.push(this);
    }

    setName(name) {this.name=name;}

    draw() {
        stroke(this.color);

        ellipse(this.pos.x,this.pos.y,10);
    }

    addNextNodes(nodes) {
        for(let n of nodes) this.nextNodes.push(n);
    }

    addPrevNodes(nodes) {
        for(let n of nodes) this.prevNodes.push(n);
    }

    hashCode() {
        let tmp = ( this.pos.y +  ((this.pos.x+1)/2));
        return this.pos.x +  ( tmp * tmp);
    }

    is(code) {
        return this.hashCode()==code;
    }

    copy() {
        let n=new Node(this.pos.x,this.pos.y,false);
    }
}

class Trail {
    constructor(nodeA,nodeB) {
        this.nodeA=nodeA;
        this.nodeB=nodeB;
        this.pheromones=0;
        this.dist=nodeA.pos.dist(nodeB.pos);
        this.visibility=1/this.dist;
        
        this.intervalUpdate=setInterval(() => this.pheromones=this.pheromones<0.005?0:this.pheromones*0.1,1000);
    }

    draw() {
        stroke(255,255,255,this.pheromones*nbAnt*0.1);
        strokeWeight(2);
        line(this.nodeA.pos.x,this.nodeA.pos.y,this.nodeB.pos.x,this.nodeB.pos.y);
    }
}