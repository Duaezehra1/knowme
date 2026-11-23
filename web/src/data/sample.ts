import shared from '../../../shared/knowme.json'
import { createPassport, makeEntry } from './store'
import type { Passport, SectionId } from './types'

/**
 * A ready-made passport for a fictional child, so anyone (and every judge) can try KnowMe
 * in one tap, with or without AI. Shared with the Android app (SRS PR-07: no real child's data).
 */
export function demoPassport(): Passport {
  const d = shared.demo
  const p = createPassport({
    firstName: d.child.firstName,
    age: d.child.age,
    avatar: d.child.avatar,
    contactName: d.contact.name,
    contactRelation: d.contact.relation,
    phone: d.contact.phone,
    country: 'OTHER',
    emergencyNumber: d.emergencyNumber,
  })
  return {
    ...p,
    demo: true,
    child: { ...p.child, aboutMe: d.child.aboutMe },
    // Sam is made up, so cloud help is on: judges without on-device AI still see AI answers.
    settings: { ...p.settings, cloudHelp: true },
    entries: d.entries.map((e) => makeEntry({ ...e, section: e.section as SectionId, source: 'owner' })),
  }
}

/** Fictional sample notes for the demo and judges (SRS PR-07: no real child's data). */
export const SAMPLE_NOTES = `Sam is 7 and autistic. He doesn't speak much, but he has his own words.
When he says "ba-ba" and points at the window, he wants to watch the buses. Two minutes at the window and then saying "bus finished" usually works.
"Wa" means he wants water. "Mama-dee" means he wants me.
If he pulls your hand to the fridge, he is hungry.

When he hits his ear and says "ow-ee", he is either in pain or it is too loud for him. Take him somewhere quiet first. If he keeps doing it, he may have an ear infection, so call me.
When he is ill he goes very quiet and lies on the floor.

Loud noises like hand dryers, blenders and fire alarms upset him a lot. So do sudden changes to his routine.
Please don't touch his head or grab his arm; he panics.

Humming "Twinkle Twinkle Little Star" calms him down. A tight hug or a heavy blanket also helps when he is overwhelmed.
Flapping his hands means he is happy or excited. It is fine, please don't stop him.

He loves buses, trains, the colour yellow and banana slices.

He is allergic to peanuts. He carries an EpiPen in the front pocket of his bag.

He needs the toilet every 2 hours. He will stand by the door and rock if he needs to go.
He gets tired after lunch and may need 20 minutes of quiet time.

Sam runs off when he sees a bus or water, and he doesn't understand traffic. Always hold his hand near roads.
If he is lost, he will not answer to his name. Speak softly, say "Sam, bus finished", and stay with him.`
