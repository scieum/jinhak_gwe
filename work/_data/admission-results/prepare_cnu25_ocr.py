from pathlib import Path
import fitz,io,json
from PIL import Image
P=Path(__file__).parent/'chungcheong-expansion';D=P/'cnu25-ocr';D.mkdir(exist_ok=True)
items=[]
for key,pages in [('cnu-scan06-16',list(range(4,12))+list(range(13,28))+[29]),('cnu-scan06-19',list(range(4,9)))]:
 doc=fitz.open(P/(key+'.pdf'))
 for page in pages:
  x=doc[page-1].get_images(full=True)[-1];im=Image.open(io.BytesIO(doc.extract_image(x[0])['image'])).convert('RGB')
  name=f'{key}-p{page}';original=D/(name+'.png');im.save(original)
  pieces=[]
  for x0 in range(0,im.width,850):
   for y0 in range(0,im.height,550):
    box=(max(0,x0-25),max(0,y0-25),min(im.width,x0+875),min(im.height,y0+575))
    f=D/f'{name}-x{x0}-y{y0}.png'
    im.crop(box).resize(((box[2]-box[0])*2,(box[3]-box[1])*2)).save(f)
    pieces.append({'path':str(f),'crop':box,'core':[x0,y0,min(im.width,x0+850),min(im.height,y0+550)]})
  items.append({'key':key,'page':page,'width':im.width,'height':im.height,'original':str(original),'pieces':pieces,'text':doc[page-1].get_text()})
(D/'manifest.json').write_text(json.dumps(items,ensure_ascii=False,indent=2),encoding='utf8')
(D/'image-list.json').write_text(json.dumps([x['path'] for it in items for x in it['pieces']]),encoding='utf8')
print(len(items),'tables',sum(len(x['pieces']) for x in items),'OCR tiles')
