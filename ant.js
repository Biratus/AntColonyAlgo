class Ant {
    constructor(pt) {
        this.nodeTrace=[pt];
        this.pos=pt.pos.copy();
        this.vel=createVector();
        this.speed=10;
        this.lifespan=1000*3.5;//10s
        this.startDate=new Date().getTime();
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
            //this.leavePheromones();
            this.nodeTrace.push(this.target);
            this.finishCallback.call(this);
        }
        if(this.lifespan<new Date().getTime()-this.startDate) {
            killAnt(this);
        }
    }

    leavePheromones() {
        let trail = graph.getTrail(this.currentNode(),this.target);
        //trail.pheromones+=q/trail.dist;
        if(trail.pheromones==0) trail.pheromones=1;
        else trail.pheromones*=1.5;
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
        noStroke();
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
            //            trail.pheromones+=q/totDist;
            trail.pheromones+=1;

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
