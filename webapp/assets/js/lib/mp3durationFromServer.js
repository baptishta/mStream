const mp3durationFromServer = (()=> {

async function getMp3Duration(url) {
  // Fetch the first 128 KB. This is enough for the vast majority
  // of MP3s, including ID3v2 tags and Xing/VBRI headers.
  const response = await fetch(url, {
    headers: {
      Range: "bytes=0-131071"
    }
  });

  if (response.status !== 206 && response.status !== 200) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = new Uint8Array(await response.arrayBuffer());

  // Total file size, if the server supports Content-Range.
  const contentRange = response.headers.get("Content-Range");
  const totalSize = parseContentRangeSize(contentRange);

  const duration = parseMp3(data, totalSize);

  if (duration != null) {
    return duration;
  }

  throw new Error(
    "Could not determine MP3 duration from the available data"
  );
}


/* ============================================================
   MP3 parser
   ============================================================ */

function parseMp3(data, totalSize) {
  let offset = skipId3v2(data);

  // Find the first valid MPEG frame.
  const firstFrame = findFrame(data, offset);

  if (!firstFrame) {
    return null;
  }

  // Look for Xing/Info.
  const xing = findXing(data, firstFrame);

  if (xing) {
    return xing;
  }

  // Look for VBRI.
  const vbri = findVbri(data, firstFrame);

  if (vbri) {
    return vbri;
  }

  // If there is no VBR header, assume CBR.
  //
  // Duration = file bits / bitrate.
  if (totalSize && firstFrame.bitrate) {
    return (totalSize * 8) / (firstFrame.bitrate * 1000);
  }

  return null;
}


/* ============================================================
   ID3v2
   ============================================================ */

function skipId3v2(data) {
  if (
    data.length >= 10 &&
    data[0] === 0x49 &&
    data[1] === 0x44 &&
    data[2] === 0x33
  ) {
    const flags = data[5];

    // ID3v2 uses a synchsafe integer for the tag size.
    const size =
      ((data[6] & 0x7f) << 21) |
      ((data[7] & 0x7f) << 14) |
      ((data[8] & 0x7f) << 7) |
      (data[9] & 0x7f);

    let end = 10 + size;

    // Footer present.
    if (flags & 0x10) {
      end += 10;
    }

    return end;
  }

  return 0;
}


/* ============================================================
   MPEG frame parsing
   ============================================================ */

function findFrame(data, start) {
  for (let i = start; i < data.length - 4; i++) {
    const frame = parseFrameHeader(data, i);

    if (frame) {
      return frame;
    }
  }

  return null;
}


function parseFrameHeader(data, offset) {
  if (offset + 4 > data.length) {
    return null;
  }

  const b1 = data[offset];
  const b2 = data[offset + 1];
  const b3 = data[offset + 2];
  const b4 = data[offset + 3];

  // 11-bit MPEG sync word.
  if (b1 !== 0xff || (b2 & 0xe0) !== 0xe0) {
    return null;
  }

  const versionBits = (b2 >> 3) & 0x03;
  const layerBits = (b2 >> 1) & 0x03;
  const protectionBit = b2 & 1;

  // We only support Layer III here.
  if (layerBits !== 1) {
    return null;
  }

  const versionMap = {
    3: 1,
    2: 2,
    0: 2.5
  };

  const version = versionMap[versionBits];

  if (!version) {
    return null;
  }

  const bitrateIndex = (b3 >> 4) & 0x0f;
  const sampleRateIndex = (b3 >> 2) & 0x03;
  const padding = (b3 >> 1) & 1;

  // Channel mode.
  const channelMode = (b4 >> 6) & 0x03;

  const sampleRates = {
    1: [44100, 48000, 32000],
    2: [22050, 24000, 16000],
    2.5: [11025, 12000, 8000]
  };

  const sampleRate =
    sampleRates[version]?.[sampleRateIndex];

  if (!sampleRate) {
    return null;
  }

  const bitrateTables = {
    1: [
      0, 32, 40, 48, 56, 64, 80, 96,
      112, 128, 160, 192, 224, 256, 320, 0
    ],

    2: [
      0, 8, 16, 24, 32, 40, 48, 56,
      64, 80, 96, 112, 128, 144, 160, 0
    ],

    2.5: [
      0, 8, 16, 24, 32, 40, 48, 56,
      64, 80, 96, 112, 128, 144, 160, 0
    ]
  };

  const bitrate =
    bitrateTables[version]?.[bitrateIndex];

  if (!bitrate) {
    return null;
  }

  const samplesPerFrame = version === 1 ? 1152 : 576;

  const frameLength =
    version === 1
      ? Math.floor((144 * bitrate * 1000) / sampleRate) + padding
      : Math.floor((72 * bitrate * 1000) / sampleRate) + padding;

  // Size of side information.
  const sideInfoSize =
    version === 1
      ? channelMode === 3 ? 17 : 32
      : channelMode === 3 ? 9 : 17;

  const headerSize = 4;

  return {
    offset,
    version,
    bitrate,
    sampleRate,
    samplesPerFrame,
    frameLength,
    channelMode,
    sideInfoSize,
    headerSize,
    protectionBit
  };
}


/* ============================================================
   Xing / Info
   ============================================================ */

function findXing(data, frame) {
  /*
   * Xing/Info starts after:

       MPEG header
       + CRC (if present)
       + side information
  */

  const crcSize = frame.protectionBit ? 0 : 2;

  const offset =
    frame.offset +
    4 +
    crcSize +
    frame.sideInfoSize;

  if (offset + 16 > data.length) {
    return null;
  }

  const identifier = readString(data, offset, 4);

  if (identifier !== "Xing" && identifier !== "Info") {
    return null;
  }

  const flags = readUint32(data, offset + 4);

  // Frames flag.
  if (!(flags & 0x0001)) {
    return null;
  }

  const frames = readUint32(data, offset + 8);

  if (!frames) {
    return null;
  }

  return (
    frames *
    frame.samplesPerFrame /
    frame.sampleRate
  );
}


/* ============================================================
   VBRI
   ============================================================ */

function findVbri(data, frame) {
  /*
   * Fraunhofer VBRI is normally located 32 bytes after
   * the MPEG audio header.
   */

  const offset = frame.offset + 4 + 32;

  if (offset + 26 > data.length) {
    return null;
  }

  if (readString(data, offset, 4) !== "VBRI") {
    return null;
  }

  // VBRI structure:
  //
  // 0-3    "VBRI"
  // 4-5    version
  // 6-7    delay
  // 8-9    quality
  // 10-13  bytes
  // 14-17  frames

  const frames = readUint32(data, offset + 14);

  if (!frames) {
    return null;
  }

  return (
    frames *
    frame.samplesPerFrame /
    frame.sampleRate
  );
}


/* ============================================================
   HTTP helpers
   ============================================================ */

function parseContentRangeSize(header) {
  if (!header) {
    return null;
  }

  // Example:
  // bytes 0-131071/12345678

  const match = header.match(/\/(\d+)$/);

  return match ? Number(match[1]) : null;
}


/* ============================================================
   Binary helpers
   ============================================================ */

function readUint32(data, offset) {
  return (
    data[offset] * 0x1000000 +
    data[offset + 1] * 0x10000 +
    data[offset + 2] * 0x100 +
    data[offset + 3]
  );
}


function readString(data, offset, length) {
  return String.fromCharCode(
    ...data.subarray(offset, offset + length)
  );
}
//end

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

return {
    getMp3Duration,
    formatDuration
};
})();