// Updated AudiobookPlayer.tsx

import React from 'react';

const AudiobookPlayer = () => {
  // Your existing code...

  // Fixing the MIME type and extension from audio/wav to audio/pcm
  const createBlob = (pcmBytes) => {
    // Ensure that the Blob is created correctly with decoded PCM bytes
    return new Blob([pcmBytes], { type: 'audio/pcm' });
  };

  // More of your existing code...
};

export default AudiobookPlayer;