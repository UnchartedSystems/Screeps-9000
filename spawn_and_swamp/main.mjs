import { prototypes as P, utils as U, constants as C, getTicks } from '/game';
import * as L from "./lib.mjs";

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

let containers;


let workerWastedTime = 0;
let workerWastedTick = false;
let workerWastedLastTick = false;
let workerTimePercent = 0;

let spawnerWastedTime = 0;
let spawnerWastedTick = false;
let spawnerWastedLastTick = false;
let spawnerTimePercent = 0;

export function loop() {


    if(!myStructs.spawns.length) myStructs.spawns.push(U.getObjectsByPrototype(P.StructureSpawn).filter(s => s.my)[0]);
    


    containers = U.getObjectsByPrototype(P.StructureContainer);
    enStructs.spawns = U.getObjectsByPrototype(P.StructureSpawn).filter(s => !s.my);
    enCreeps.units = U.getObjectsByPrototype(P.Creep).filter(s => !s.my);

    // Enemy Spawn Accounting - CURRENT FOCUS!!
    for (let creep of enCreeps.units) {
        if (!creep.scanned) {
            creep.scanned = true;
            debugAssess(creep, "NEW ENCREEP")
        }
    }

    // Spawn Logic
    // Drops Ticks on Build -> combatBuild but Build shift is always tick AFTER other spawn. so nbd
    if (build.length) {
        if ( spawnCreep(myStructs.spawns[0], L.head(build)) ) {
        build = L.tail(build);
        }
    } else {
        build = combatBuild;
    }



    // Fighter Logic, incredibly stupid
    for (let creep of myCreeps.fighters) {
        if (enCreeps.units.length) {
            actionMove(creep, enCreeps.units, true)
        } else {
            actionMove(creep, enStructs.spawns, false)
        }
    }


    // Worker Logic, lots of inefficiencies
    for (let creep of myCreeps.workers.filter(w => w.store) ) {
        if (creep.store.getFreeCapacity(C.RESOURCE_ENERGY)) {
            let container = U.findClosestByPath(creep, containers.filter(c => c.store.energy));
            if (creep.withdraw(container, C.RESOURCE_ENERGY)) {
                creep.moveTo(container);
            }
        } else {
            let transferReturn = creep.transfer(myStructs.spawns[0], C.RESOURCE_ENERGY);
            if (transferReturn == C.ERR_NOT_IN_RANGE) { creep.moveTo(myStructs.spawns[0]); }
            else if (transferReturn == C.ERR_FULL) {workerWastedTick = true;}
        }
    }


    // Economy Analytics
    // Consider: show when worker downtime starfts/stops on the tick
    workerWastedTime += workerWastedTick;
    if (!workerWastedLastTick && workerWastedTick) workerWastedLastTick = workerWastedTick, console.log("Worker STARTS wasting ticks");
    if (workerWastedLastTick && !workerWastedTick) {
        workerWastedLastTick = workerWastedTick;
        workerTimePercent = workerWastedTime/getTicks() * 100;
        console.log(`Worker STOPS wasting ticks | Total Downtime: ${workerWastedTime}t, ${workerTimePercent.toFixed(2)}%`);
    }
    workerWastedTick = false;

    spawnerWastedTime += spawnerWastedTick;
    if (!spawnerWastedLastTick && spawnerWastedTick) spawnerWastedLastTick = spawnerWastedTick, console.log("Spawner STARTS wasting ticks");
    if (spawnerWastedLastTick && !spawnerWastedTick) {
        spawnerWastedLastTick = spawnerWastedTick;
        spawnerTimePercent = spawnerWastedTime/getTicks() * 100;
        console.log(`Spawner STOPS wasting ticks | Total Downtime: ${spawnerWastedTime}t, ${spawnerTimePercent.toFixed(2)}%`);
    }
    spawnerWastedTick = false;   
}

// Need a MUCH better priority system
// ( action(target) || creep.action(target) )
function actionMove(creep, targets, isCreep) {
    let target = U.findClosestByPath(creep, targets);
    if (!creep.action(target) && creep.body && isCreep) {
        debugAssess(target, "ENEMY")
        debugAssess(creep, "ALLY")
    }
        creep.moveTo(target);
}

function debugAssess(c, name) {
    console.log(`${name}: Health ${c.hits} / ${c.hitsMax} Speed: ${L.assessMobility(c).toFixed(2)} Heal: ${L.assessHeal(c)} Ranged: ${L.assessRangedAttack(c)} Melee: ${L.assessMeleeAttack(c)} Damage: ${L.assessTotalAttack(c)}`);
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
     } else {
        if(spawnReturn.error == C.ERR_NOT_ENOUGH_ENERGY) spawnerWastedTick = true;
        return false; 
    }
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
        build: [C.TOUGH, C.ATTACK, C.ATTACK, C.ATTACK, C.ATTACK, C.ATTACK, C.ATTACK, C.ATTACK, C.MOVE, C.MOVE, C.MOVE, C.MOVE, C.MOVE, C.MOVE, C.MOVE, ],
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
        build: [C.TOUGH, C.HEAL, C.HEAL, C.MOVE, C.MOVE, C.MOVE, C.MOVE,],
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


