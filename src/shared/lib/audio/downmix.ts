/*
Turns interleaved PCM (L R L R … for stereo) into one channel by averaging every channel of each
frame. The analysis only asks how loud the file is, not where a sound sits between the speakers.
ffmpeg's own `-ac 1` would come out about 3 dB louder than this plain average.
*/
export function downmix(interleaved: Float32Array, channelCount: number): Float32Array {
  if (channelCount === 1) return interleaved

  const frameCount = Math.floor(interleaved.length / channelCount)
  const mono = new Float32Array(frameCount)
  for (let frame = 0; frame < frameCount; frame++) {
    let sum = 0
    for (let channel = 0; channel < channelCount; channel++) {
      sum += interleaved[frame * channelCount + channel] ?? 0
    }
    mono[frame] = sum / channelCount
  }
  return mono
}
