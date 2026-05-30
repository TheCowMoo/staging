"""Convert fivestones_alarm.mp3 to alarm.wav for embedding."""
from pydub import AudioSegment
import os

mp3_path = 'alarm.mp3'
wav_path = 'alarm.wav'

if os.path.exists(mp3_path):
    audio = AudioSegment.from_mp3(mp3_path)
    audio.export(wav_path, format='wav')
    wav_size = os.path.getsize(wav_path)
    print(f'Converted: {mp3_path} -> {wav_path} ({wav_size} bytes)')
else:
    print(f'MP3 not found: {mp3_path}')