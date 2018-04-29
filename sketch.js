class Point {

    constructor(x,y) {
        this.pos=createVector(x,y);

        this.color=[255,0,0];
    }

    draw() {
        fill(this.color);

        ellipse(this.pos.x,this.pos.y,10);
    }

    hashCode() {
        let tmp = ( this.pos.y +  ((this.pos.x+1)/2));
        return this.pos.x +  ( tmp * tmp);
    }

    is(code) {
        return this.hashCode()==code;
    }
}

var q;
var backAndForth=0;

var selectedNodes=[];
var nodes=[];
var ants=[];

var visibility=new Map();
var pheromones=new Map();

var food;
var start;

var graph;

var nbAnt=20;
var nbNode=4;
var nbNodeLayer=5;

var gamma=0.1;
var pheromoneIntensity=1;
var visibilityIntensity=1;//are they attracted by other nodes



/*

TODO: 

Lifespan for ant
food increases lifespan
when ant die other is born

*/


function setup() {
    createCanvas(500,500);

    //Food
    food=new Node(width*0.5,height*0.9);
    food.color=[0,255,0];

    //Start
    start=new Node(width*0.5,height*0.1);
    start.color=[0,0,255];

    q=start.pos.dist(food.pos);

    graph=new Graph(start);

    let prevNodes=[start];

    for(let i=0;i<nbNodeLayer;i++) {
        let nextNodes=[];
        let y=map(i,0,nbNodeLayer,start.pos.y,food.pos.y)+(food.pos.y-start.pos.y)/(2*nbNodeLayer);
        for(let j=0;j<nbNode;j++) {
            //let n=new Node(j*width/nbNode+0.5*width/nbNode,y);
            let n=new Node(random(width),y);
            n.addPrevNodes(prevNodes);
            nextNodes.push(n);
        }
        for(let n of prevNodes) {
            n.addNextNodes(nextNodes);
        }
        prevNodes=nextNodes;
    }

    for(let n of prevNodes) {
        n.addNextNodes([food]);
    }

    food.addPrevNodes(prevNodes);

    graph.generateTrails();


    //Ants
    for(let i=0;i<nbAnt;i++) {
        ants.push(new Ant(start));
    }
    for(let a of ants) seekFood(a);
}

var drawBest=false;
var drawAnt=false;
function draw() {
    background(0);
    start.draw();
    food.draw();

    for(let a of ants) {
        a.update();
        if(drawAnt) a.draw();
    }

    //for(let n of nodes) n.draw();

    graph.draw();
    if(drawBest) graph.highlightBest();

    drawSelected();

}

function killAnt(ant) {
    console.log("birth");
    let ant_=new Ant(start);
    ants[ants.indexOf(ant)]=ant_;
    seekFood(ant_);
    ant=null;
}

function codeFromPoints(node1,node2) {
    let code_n1=node1.hashCode();
    let code_n2=node2.hashCode();

    let i=code_n1<code_n2?code_n1:code_n2;
    let j=code_n1<code_n2?code_n2:code_n1;

    return new Point(i,j).hashCode();
}

function seekFood(ant) {
//    let ant=ants[antIndex];
    let antCode=ant.posHashCode();

    if(antCode==food.hashCode()) {
        ant.leaveRelativePheromones();
        ant.lifespan+=500;
        if(ant.lifespan>7000) ant.lifespan=7000 ;
        //console.log(new Date().getTime()-ant.startDate);
        returnHome(ant);
        return;
    }

    let possibleNodes=ant.currentNode().nextNodes;
    let target = pickNextNodeFromPossible(ant.currentNode(),possibleNodes);

    if(target==null) {
        console.error("next node is null");
        ant.stop();
    }
    else {  //launch set target for ant 
        ant.goTo(target,() => seekFood(ant));
    }

}

function returnHome(ant) {
   // let ant=ants[antIndex];

    let antCode=ant.posHashCode();

    if(antCode==start.hashCode()) {
        seekFood(ant);
        ant.leaveRelativePheromones();
        if(ants[0]===ant) backAndForth++;
        ant.nodeTrace=[start];
        ant.startDate=new Date().getTime();
        return;
    }

    let possibleNodes=ant.currentNode().prevNodes;
    let target = pickNextNodeFromPossible(ant.currentNode(),possibleNodes);

    if(target==null) {
        console.error("next node is null");
        ant.stop();
    }
    else {  //launch set target for ant 
        ant.goTo(target,() => returnHome(ant));
    }
}

function pickNextNodeFromPossible(currentNode,possibleNodes) {
    let sum=0;
    let probs=new Map()
    //Calculate sum of probs
    for (let node of possibleNodes) {

        let trail = graph.getTrail(node,currentNode);
        sum+=gamma
            +Math.pow(trail.pheromones,pheromoneIntensity)
            *Math.pow(trail.visibility,visibilityIntensity);
    }
    //Calculate overall probs between all possible nodes
    for(let node of possibleNodes) {
        let code_node=node.hashCode();

        let trail = graph.getTrail(node,currentNode);

        let num=gamma
        +Math.pow(trail.pheromones,pheromoneIntensity)
        *Math.pow(trail.visibility,visibilityIntensity);

        probs.set(code_node,num/sum);
    }

    //probs.forEach((v,k) => console.log(k+" "+v));

    //choose the next node according to probs
    let code=pickOne(probs);
    for(let node of possibleNodes) {
        let code_node=node.hashCode();
        if(code_node==code) {
            return node;
        }
    }
    return null;
}

function pickOne(probs) {
    let count=0;
    let rnd=random();
    for(let e of probs) {
        count+=e[1];
        if(rnd<=count) {
            return e[0];
        }
    }
    return null;
}

function goToRandomNode(antIndex) {
    ants[antIndex].goTo(nextNode(ants[antIndex]),()=> goToRandomNode(antIndex));
}

function mouseClicked() {
    let mousePos=createVector(mouseX,mouseY);
    let possibleNodes=render_nodes.filter(n => mousePos.dist(n.pos)<5);
    let possibleNode=possibleNodes[0];
    if(possibleNodes.length>1) {
        let minDist=6;
        for(let n of possibleNodes) {
            if(n.pos.dist(mousePos)<minDist) {
                possibleNode=n;
                minDist=n.pos.dist(mousePos);
            }
        }
    } else if(possibleNodes.length==0) return;

    console.log(possibleNode);
    if(selectedNodes.includes(possibleNode)) {
        possibleNode.color=[255,255,0];
        selectedNodes=selectedNodes.filter(n_ => n_.pos.equals(possibleNode.pos));
    }
    else {
        possibleNode.color=[0,0,255];
        selectedNodes.push(possibleNode);
    }
}

function drawSelected() {
    if(selectedNodes.length<=1) return;

    let prevNode=null;
    let trailTrace=[];
    for(let n of selectedNodes) {
        if(prevNode==null) {
            prevNode=n;
        }
        else {
            trailTrace.push(new Trail(n,prevNode));
            prevNode=n;
        }
    }
    for(let t of trailTrace) {
        stroke(255,0,0,150);
        strokeWeight(5);
        line(t.nodeA.pos.x,t.nodeA.pos.y,t.nodeB.pos.x,t.nodeB.pos.y);
    }
}

function getBestTrail() {
    let trailTrace=[];
    let currNode=graph.start;

    while(currNode.nextNodes.length>0) {
        let bestTrail=null;
        let bestNode=null;
        for(let n of currNode.nextNodes) {
            let t=graph.getTrail(currNode,n);
            if(!bestTrail || t.pheromones>bestTrail.pheromones) {
                bestTrail=t;
                bestNode=n;
            }
        }
        trailTrace.push(bestTrail);
        currNode=bestNode;
    }
    console.log(trailTrace.reduce((acc,elt) => acc+=elt.dist,0));
    return trailTrace;  
}

function getDistTrail() {
    let totDist=0;
    let prevNode=null;
    let trailTrace=[];
    for(let n of selectedNodes) {
        if(prevNode==null) {
            prevNode=n;
        }
        else {
            trailTrace.push(new Trail(n,prevNode));
            totDist+=new Trail(n,prevNode).dist;
            prevNode=n;
        }
    }
    console.log(totDist);

    console.log(trailTrace.reduce((acc,elt) => acc+=elt.dist,0));

}

function nextNode(node) {
    let nextNode=null;
    do {
        let i=floor(random(nodes.length));
        nextNode=nodes[i];
    } while(node.pos.equals(nextNode.pos));

    return nextNode;
}