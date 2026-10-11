const cloudinary = require('cloudinary').v2;

const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      // Check if URL or base64 was sent in body
      if (req.body && req.body.imageUrl) {
        const uploadRes = await cloudinary.uploader.upload(req.body.imageUrl, {
          folder: 'earthsync',
          transformation: [{ quality: 'auto', fetch_format: 'auto' }]
        });
        return res.status(201).json({
          status: 'success',
          data: {
            url: uploadRes.secure_url,
            publicId: uploadRes.public_id,
            width: uploadRes.width,
            height: uploadRes.height
          }
        });
      }
      return res.status(400).json({ error: 'No image file or image URL provided' });
    }

    // Upload from buffer
    const streamUpload = (buffer) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'earthsync',
            transformation: [{ quality: 'auto', fetch_format: 'auto' }]
          },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        stream.end(buffer);
      });
    };

    const result = await streamUpload(req.file.buffer);

    res.status(201).json({
      status: 'success',
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format
      }
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    res.status(500).json({ error: 'Image upload failed: ' + (error.message || 'Cloudinary error') });
  }
};

module.exports = {
  uploadImage
};
