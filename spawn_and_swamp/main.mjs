import { prototypes as P, utils as U, constants as C, getTicks } from '/game';

const head = ([h]) => h;
const tail = ([, ...t]) => t;

const myCreeps = {
    fighters: [],
    workers: [],
}

const myStructs = {
    spawns: [],
    towers: [],
}

const enCreeps = {
    units: [],
    fighters: [],
    workers: [],
}

const enStructs = {
    spawns: [],
    towers: [],
}

let workerDowntime = 0;
let tickDowntime;

let containers;



export function loop() {
    console.log(C)
    tickDowntime = 0;

    if(!myStructs.spawns.length) {
        myStructs.spawns.push(U.getObjectsByPrototype(P.StructureSpawn).filter(s => s.my)[0]);
    }
    
    containers = U.getObjectsByPrototype(P.StructureContainer);

    enStructs.spawns = U.getObjectsByPrototype(P.StructureSpawn).filter(s => !s.my);
    enCreeps.units = U.getObjectsByPrototype(P.Creep).filter(s => !s.my);

    // Spawn Logic
    // Drops Ticks on Build -> combatBuild
    if ( build.length ) {
        if ( spawnCreep(myStructs.spawns[0], head(build)) ) {
        build = tail(build);
        }
    } else {
        build = combatBuild;
    }



    // Fighter Logic, incredibly stupid
    for ( let creep of myCreeps.fighters ) {
        if (enCreeps.units.length) {
            actionMove(creep, enCreeps.units)
        } else {
            actionMove(creep, enStructs.spawns)
        }
    }

    
    tickDowntime = 0;

    // Worker Logic, lots of inefficiencies
    for (let creep of myCreeps.workers.filter(w => w.store) ) {
        if ( creep.store.getFreeCapacity(C.RESOURCE_ENERGY) ) {
            let container = U.findClosestByPath(creep, containers.filter(c => c.store.energy));
            if ( creep.withdraw(container, C.RESOURCE_ENERGY) ) {
                creep.moveTo(container);
            }
        }
        else {
            let transferReturn = creep.transfer(myStructs.spawns[0], C.RESOURCE_ENERGY);
            if ( transferReturn == C.ERR_NOT_IN_RANGE) { creep.moveTo(myStructs.spawns[0]); }
            else if ( transferReturn == C.ERR_FULL ) { tickDowntime = 1; }
        }
    }

    
    if ( tickDowntime ) { 
        workerDowntime += tickDowntime;
        let downtimePercent = workerDowntime/getTicks() * 100;
        console.log(`Worker Downtime: ${workerDowntime}t, ${downtimePercent.toFixed(2)}%`)
     }
    
}
// Need a MUCH better priority system
// ( action(target) || creep.action(target) )
function actionMove(creep, targets, action) {
    let target = U.findClosestByPath(creep, targets);
    if ( creep.action(target) ) {
        creep.moveTo(target);
    }
}


// Future Change:
// Allow for Intermediary Action Function that takes Creep functions as inputs
// eg: worker with action that uses target type to choose between harvest / transfer / withdraw etc
function spawnCreep(spawner, role) {
     let spawnReturn = spawner.spawnCreep(role.build)
     if(spawnReturn.object) {
         let creep = spawnReturn.object;
         // Role oriented initializing
         let { [role.action]: action } = creep;
         creep.action = action;
         // Push to Correct Struct
         role.ref.push(creep);
         return true;
     } else { return false; }
}

const roles = {
    harrass: {
        build: [C.MOVE, C.MOVE, C.MOVE, C.MOVE, C.MOVE, C.RANGED_ATTACK],
        action: 'attack',
        ref: myCreeps.fighters,
    },
    worker: {
        build: [C.CARRY, C.CARRY, C.MOVE, C.MOVE],
        action: 'harvest',
        ref: myCreeps.workers,
    },
    attacker: {
        // Cost : 1000e
        build: [C.TOUGH, C.MOVE, C.ATTACK, C.MOVE, C.ATTACK, C.MOVE, C.ATTACK, C.MOVE, C.ATTACK, C.MOVE, C.ATTACK, C.MOVE, C.ATTACK,  C.MOVE, C.ATTACK, C.MOVE],
        action: 'attack',
        ref: myCreeps.fighters,

    },
    heavyRanged: {
        // Cost : 1000e
        build: [C.RANGED_ATTACK, C.RANGED_ATTACK, C.RANGED_ATTACK, C.RANGED_ATTACK, C.RANGED_ATTACK, C.MOVE, C.MOVE, C.MOVE, C.MOVE, C.MOVE],
        action: 'attack',
        ref: myCreeps.fighters,

    },
    rangedAttacker: {
        build: [C.TOUGH, C.TOUGH, C.TOUGH, C.MOVE, C.RANGED_ATTACK, C.RANGED_ATTACK],
        action: 'rangedAttack',
        ref: myCreeps.fighters,
    },
    medic: {
        build: [C.TOUGH, C.MOVE, C.HEAL, C.MOVE, C.MOVE,  C.MOVE, C.HEAL],
        action: 'heal',
        ref: myCreeps.fighters,
    }
}

let build =    [roles.worker,
                //roles.worker,
                roles.worker,]

let combatBuild =  [roles.attacker,
                    roles.rangedAttacker,
                    roles.attacker,
                    roles.attacker,
                    roles.attacker,
                    roles.attacker,
                    roles.attacker,
                    roles.attacker,
                    roles.worker,]

// undefinedValue ??= valueIfLeftIsNull