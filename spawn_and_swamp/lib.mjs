import { prototypes as P, utils as U, constants as C, getTicks } from '/game';

export const head = ([h]) => h;
export const tail = ([, ...t]) => t;


// Creep Assessment Functions
// https://docs.screeps.com/creeps.html
export function scanBody(creep, partType) {
    let count = 0;
    for (let part of creep.body) {
        if (part.type == partType) {count += 1;}
    }
    return count;
}

export function assessMobility(creep) {
    let move = 0, weight = 0;
    for (let part of creep.body) {
        if (part.type == C.MOVE) {move += 1;}
        else {weight += 1;}
    }
    return move / weight;
}

export function assessHeal(creep) {
    return scanBody(creep, C.HEAL) * 12;
}

export function assessMeleeAttack(creep) {
    return scanBody(creep, C.ATTACK) * 30;
}

export function assessRangedAttack(creep) {
    return scanBody(creep, C.RANGED_ATTACK) * 10;
}

export function assessTotalAttack(creep) {
    return assessRangedAttack(creep) + assessMeleeAttack(creep)
}