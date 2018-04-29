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
class Ant {
    constructor(pt) {
        this.nodeTrace=[pt];
        this.pos=pt.pos.copy();
        this.vel=createVector();
        this.speed=10;
    }

    goTo(pt,onFinish) {
        this.vel=pt.pos.copy().sub(this.pos).normalize();
        this.vel.mult(this.speed);
        this.target=pt;
        this.finishCallback=onFinish;
    }

    update() {
        this.pos.add(this.vel);
        if(this.target && this.pos.dist(this.target.pos)<5) {// On target!
            this.pos=this.target.pos.copy();
            this.leavePheromones();
            this.nodeTrace.push(this.target);
            this.finishCallback.call(this);
        }
    }

    leavePheromones() {
        let trail = graph.getTrail(this.currentNode(),this.target);
        trail.pheromones+=q/trail.dist;
    }

    currentNode() {
        return this.nodeTrace[this.nodeTrace.length-1];
    }

    posHashCode() {
        let tmp = ( this.pos.y +  ((this.pos.x+1)/2));
        return this.pos.x +  ( tmp * tmp);
    }

    stop() {
        this.vel.mult(0);
    }

    draw() {
        fill(255,255,0);

        ellipse(this.pos.x,this.pos.y,10);
    }

    leaveRelativePheromones() {
        let totDist=this.totalDistance();
        //console.log("totDist: "+totDist+" "+(q/totDist));
        let prevNode=null;
        for(let n of this.nodeTrace) {
            if(prevNode==null) {
                prevNode=n;
                continue;
            }

            let trail = graph.getTrail(prevNode,n);
            trail.pheromones+=q/totDist

            prevNode=n;
        }
    }

    totalDistance() {
        let totDist=0;
        let prevNode=null;
        for(let n of this.nodeTrace) {
            if(prevNode==null) {
                prevNode=n;
                continue;
            }

            totDist+=new Trail(prevNode,n).dist;

            prevNode=n;
        }
        return totDist;
    }

}

var nodes=[];
var ants=[];

var visibility=new Map();
var pheromones=new Map();

var food;
var start;

var graph;

var nbAnt=20;
var nbNode=4;
var nbNodeLayer=7;

var gamma=0.1;
var pheromoneIntensity=2;
var visibilityIntensity=0.5;

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
    for(let i in ants) seekFood(i);
}

function draw() {
    background(0);
    start.draw();
    food.draw();

    for(let a of ants) {
        a.update();
        a.draw();
    }

    //for(let n of nodes) n.draw();

    graph.draw();
    graph.highlightBest();

}

function codeFromPoints(node1,node2) {
    let code_n1=node1.hashCode();
    let code_n2=node2.hashCode();

    let i=code_n1<code_n2?code_n1:code_n2;
    let j=code_n1<code_n2?code_n2:code_n1;

    return new Point(i,j).hashCode();
}

function seekFood(antIndex) {
    let ant=ants[antIndex];
    let antCode=ant.posHashCode();

    if(antCode==food.hashCode()) {
        ant.leaveRelativePheromones();
        returnHome(antIndex);
        return;
    }

    let possibleNodes=ant.currentNode().nextNodes;
    let target = pickNextNodeFromPossible(ant.currentNode(),possibleNodes);

    if(target==null) {
        console.error("next node is null");
        ants[antIndex].stop();
    }
    else {  //launch set target for ant 
        ant.goTo(target,() => seekFood(antIndex));
    }

}

function returnHome(antIndex) {
    let ant=ants[antIndex];

    let antCode=ant.posHashCode();

    if(antCode==start.hashCode()) {
        seekFood(antIndex);
        if(antIndex==0) backAndForth++;
        ant.nodeTrace=[start];
        return;
    }

    let possibleNodes=ant.currentNode().prevNodes;
    let target = pickNextNodeFromPossible(ant.currentNode(),possibleNodes);

    if(target==null) {
        console.error("next node is null");
        ants[antIndex].stop();
    }
    else {  //launch set target for ant 
        ant.goTo(target,() => returnHome(antIndex));
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

function nextNode(node) {
    let nextNode=null;
    do {
        let i=floor(random(nodes.length));
        nextNode=nodes[i];
    } while(node.pos.equals(nextNode.pos));

    return nextNode;
}