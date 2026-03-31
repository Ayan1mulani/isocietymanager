// import Sound from "react-native-sound";

// let ringtone = null;

// export const playIVRRingtone = () => {
//   ringtone = new Sound(
//     "https://ismdoc.s3.amazonaws.com/public/asset/dec1.wav",
//     "",
//     (error) => {
//       if (error) {
//         console.log("Sound load error", error);
//         return;
//       }

//       ringtone.play(() => {
//         ringtone.release();
//       });

//       setTimeout(() => {
//         stopIVRRingtone();
//       }, 6000);
//     }
//   );
// };

// export const stopIVRRingtone = () => {
//   if (ringtone) {
//     ringtone.stop(() => {
//       ringtone.release();
//       ringtone = null;
//     });
//   }
// };