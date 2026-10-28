const MediaLightbox = ({ open, onClose, src, alt = "", downloadHref, downloadName, mode = "image" }) => {
  if (!open) return null;

  return (
    <div className="crud-chat-lightbox" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="crud-chat-lightbox__panel" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="crud-chat-lightbox__close" onClick={onClose} aria-label="Close">
          ×
        </button>
        {mode === "file" ? (
          <div className="crud-chat-lightbox__file">
            <p>{downloadName || "Attachment"}</p>
            <a href={downloadHref} target="_blank" rel="noopener noreferrer" download={downloadName}>
              Open / download file
            </a>
          </div>
        ) : mode === "video" ? (
          <video className="crud-chat-lightbox__video" src={src} controls playsInline>
            <track kind="captions" />
          </video>
        ) : (
          <img className="crud-chat-lightbox__image" src={src} alt={alt} />
        )}
      </div>
    </div>
  );
};

export default MediaLightbox;
