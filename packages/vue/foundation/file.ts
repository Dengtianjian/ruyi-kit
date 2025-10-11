const fileRender: FileReader = new FileReader();

function renderImage(file: File): Promise<string> {
  fileRender.readAsDataURL(file);
  return new Promise((resolve) => {
    fileRender.onloadend = fr => {
      resolve(fr.target?.result as string);
    }
  })

}

export default {
  renderImage
}