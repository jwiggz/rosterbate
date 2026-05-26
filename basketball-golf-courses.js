(function(root, factory){
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.RosterBateBasketballGolfCourses = factory();
  }
})(typeof self !== 'undefined' ? self : this, function(){
  'use strict';

  function clone(value){
    return JSON.parse(JSON.stringify(value));
  }

  const DEFAULT_COURSE = Object.freeze({
    id: 'rosterbate-hoop-links-3',
    title: 'RosterBate Hoop Links',
    strokeCap: 8,
    holes: [
      {
        id: 'starter-lane',
        number: 1,
        label: 'Starter Lane',
        par: 2,
        theme: { surface: 'starter-turf', accent: '#f3b35a' },
        camera: {
          mode: 'lane',
          position: { x: 0.1, y: 4.1, z: 10.6 },
          target: { x: 0.15, y: 1.2, z: -2.4 }
        },
        tee: { x: -3.8, y: 0, z: 4.6 },
        hoop: { x: 3.4, y: 3.05, z: -5.1 },
        pieces: [
          { id: 'starter-lane-main', type: 'lane', x: 0, z: -0.4, width: 7.8, length: 14.6, color: '#2f8d52' },
          { id: 'starter-left-rail', type: 'rail', x: -4.1, z: -0.4, width: 0.28, length: 14.9, height: 0.42 },
          { id: 'starter-right-rail', type: 'rail', x: 4.1, z: -0.4, width: 0.28, length: 14.9, height: 0.42 }
        ],
        obstacles: [],
        recommendedShotTypes: ['lob']
      },
      {
        id: 'bank-lane',
        number: 2,
        label: 'Bank Lane',
        par: 3,
        theme: { surface: 'night-turf', accent: '#60a5fa' },
        camera: {
          mode: 'bank',
          position: { x: -0.4, y: 4.4, z: 11.2 },
          target: { x: 0.4, y: 1.15, z: -2.2 }
        },
        tee: { x: -4.6, y: 0, z: 4.7 },
        hoop: { x: 4.1, y: 3.05, z: -5.0 },
        pieces: [
          { id: 'bank-lane-main', type: 'lane', x: -0.2, z: -0.3, width: 8.2, length: 14.8, color: '#234f3d' },
          { id: 'bank-left-rail', type: 'rail', x: -4.4, z: -0.3, width: 0.3, length: 14.9, height: 0.46 },
          { id: 'bank-right-rail', type: 'rail', x: 4.35, z: -0.3, width: 0.3, length: 14.9, height: 0.46 },
          { id: 'bank-wall', type: 'bank-wall', x: 1.4, z: -1.7, width: 3.3, length: 0.24, height: 0.78, angle: -28 }
        ],
        obstacles: [{ id: 'bank-wall', type: 'bank-wall', x: 1.4, z: -1.7, width: 3.3, height: 0.78, angle: -28 }],
        recommendedShotTypes: ['bank', 'lob']
      },
      {
        id: 'ramp-bounce-lane',
        number: 3,
        label: 'Ramp And Bounce',
        par: 3,
        theme: { surface: 'sunset-turf', accent: '#38bdf8' },
        camera: {
          mode: 'ramp',
          position: { x: -0.2, y: 4.7, z: 11.8 },
          target: { x: 0.2, y: 1.2, z: -2.0 }
        },
        tee: { x: -4.2, y: 0, z: 4.5 },
        hoop: { x: 3.8, y: 3.05, z: -5.2 },
        pieces: [
          { id: 'ramp-lane-main', type: 'lane', x: -0.1, z: -0.2, width: 7.9, length: 14.7, color: '#386641' },
          { id: 'ramp-left-rail', type: 'rail', x: -4.25, z: -0.2, width: 0.3, length: 14.8, height: 0.42 },
          { id: 'ramp-right-rail', type: 'rail', x: 4.05, z: -0.2, width: 0.3, length: 14.8, height: 0.42 },
          { id: 'center-ramp', type: 'ramp', x: -0.5, z: -1.35, width: 2.8, length: 3.2, height: 0.42, angle: 0 },
          { id: 'bounce-pad', type: 'bounce-pad', x: 1.1, z: -2.75, radius: 0.95 },
          { id: 'right-gap', type: 'hazard', x: 2.9, z: 0.7, width: 1.05, length: 2.2 }
        ],
        obstacles: [{ id: 'bounce-pad', type: 'bounce-pad', x: 1.1, z: -2.75, radius: 0.95 }],
        recommendedShotTypes: ['bounce', 'spin', 'lob']
      }
    ]
  });

  function createDefaultCourse(){
    return clone(DEFAULT_COURSE);
  }

  return { createDefaultCourse };
});
