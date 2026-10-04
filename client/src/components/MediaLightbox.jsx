const MediaLightbox = ({ open, onClose, src, alt = "", downloadHref, downloadName, mode = "image" }) => {
  if (!open) return null;

  return (
    <div className="media-lightbox" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="media-lightbox__panel" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="media-lightbox__close" onClick={onClose} aria-label="Close">
          ×
        </button>
        {mode === "file" ? (
          <div className="media-lightbox__file">
            <p>{downloadName || "Attachment"}</p>
            <a href={downloadHref} target="_blank" rel="noopener noreferrer" download={downloadName}>
              Open / download file
            </a>
          </div>
        ) : mode === "video" ? (
          <video className="media-lightbox__video" src={src} controls playsInline>
            <track kind="captions" />
          </video>
        ) : (
          <img className="media-lightbox__image" src={src} alt={alt} />
        )}
      </div>
    </div>
  );
};

export default MediaLightbox;
