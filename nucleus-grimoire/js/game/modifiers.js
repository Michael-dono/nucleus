/* Turns the artifacts you hold into the modifier table S.mods that every system reads. */
import { S } from '../core/state.js';
import { ARTIFACT_KEYS } from '../data/artifacts.js';

/* rank of an artifact (0 = not held) */
export const A = k => S.passives[k]||0;
export const heldArtifacts = () => ARTIFACT_KEYS.filter(k => (S.passives[k]||0) > 0);

export function computeMods(){
  const g = A;
  S.mods = {
    dmg:    1 + 0.12*g('power'),
    area:   1 + 0.10*g('magnitude'),
    dur:    1 + 0.15*g('duration'),
    cd:     Math.pow(0.92, g('haste')),
    count:  g('multicast'),
    speed:  1 + 0.08*g('swift'),
    pickup: 1 + 0.35*g('attune'),
    xp:     1 + 0.08*g('attune'),
    dr:     Math.pow(0.92, g('ward')),
    regen:  0.28*g('regrowth'),
    exec:   1 + 0.25*g('execlens'),
    lifesteal: 0.2*g('blood'),
    burn:   1 + 0.40*g('cinderheart'),   /* fire burns harder */
    rimeSlow: 0.05*g('rimelens'),        /* ice slows deeper */
    chill:  0.25*g('shatterpoint')       /* slowed shapes take more */
  };
}
