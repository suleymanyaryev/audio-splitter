#!/bin/sh
# Makes the committed test fixtures with native ffmpeg (run once from the repo root; the outputs
# are committed, so neither specs nor CI need ffmpeg).
#
# Every fixture is 30 s of stereo: three 440 Hz tone bursts at half amplitude, separated by two
# 2 s silences (8.5 s tone, 2 s silence, 9 s tone, 2 s silence, 8.5 s tone). The silences sit at
# 8.5-10.5 s and 19.5-21.5 s, so their middles (9.5 s and 20.5 s) are where splits belong.
set -eu

cd "$(dirname "$0")"

bursts() {
  rate=$1
  echo "aevalsrc=0.5*sin(2*PI*440*t)*(between(t\,0\,8.5)+between(t\,10.5\,19.5)+between(t\,21.5\,30)):s=$rate:c=stereo:d=30"
}

# One fixture per supported format, at the rate each format usually has.
ffmpeg -y -v error -f lavfi -i "$(bursts 44100)" -c:a aac -b:a 96k bursts.m4a
ffmpeg -y -v error -f lavfi -i "$(bursts 44100)" -c:a libmp3lame -b:a 96k bursts.mp3
ffmpeg -y -v error -f lavfi -i "$(bursts 48000)" -c:a libopus -b:a 64k bursts.opus
ffmpeg -y -v error -f lavfi -i "$(bursts 44100)" -c:a libvorbis -q:a 2 bursts.ogg

# The same bursts as AAC in a video: a 160x90 test picture at 10 fps beside the audio. A track cut
# from it must hold the audio only.
ffmpeg -y -v error -f lavfi -i "$(bursts 44100)" -f lavfi -i "testsrc=s=160x90:r=10:d=30" \
  -map 1:v -map 0:a -c:v libx264 -preset veryfast -pix_fmt yuv420p -c:a aac -b:a 96k bursts-video.mp4

# The same as Opus in a WebM, with a VP9 picture.
ffmpeg -y -v error -f lavfi -i "$(bursts 48000)" -f lavfi -i "testsrc=s=160x90:r=10:d=30" \
  -map 1:v -map 0:a -c:v libvpx-vp9 -b:v 100k -deadline realtime -cpu-used 8 -pix_fmt yuv420p \
  -c:a libopus -b:a 64k bursts-video.webm

# Readable but not a supported format: FLAC. Only its type matters, so it is short and mono.
ffmpeg -y -v error -f lavfi -i "$(bursts 44100)" -t 3 -ac 1 -c:a flac unsupported.flac
