const tagsPerPage=20;

document.getElementById('uploadbutton').addEventListener('click',async ()=>{
    const fileInput =document.getElementById('imageInput');
    const file=fileInput.files[0];
    const imagePreview=document.getElementById('imagePreview');
    const uploadModal=document.getElementById('uploadModal');
    const uploadProgress=document.getElementById('uploadProgress');

    if(!file) return showToast('Lütfen resim seçiniz!');


    const reader=new FileReader();
    reader.onload=e=>imagePreview.src=e.target.result;
    reader.readAsDataURL(file);

    const apiKey='acc_c99cecb9e37d486';
    const apiSecret='96d7f9e95b62055757d4d518d8da6f0f';
    const authHeader='Basic' +btoa(`${apiKey}:${apiSecret}`);

    const formData = new FormData(); 
    formData.append('image', file); 

    try{
        uploadModal.style.display='block';
        uploadProgress.style.width='0%';

        const uploadResponse= await fetch('https://api.imagga.com/v2/uploads',
            {
              method:'POST',
              headers:{'Authorization':authHeader},
              body:formData      
            });
            if(uploadResponse.ok) throw new Error('Dosya yüklenemedi.');
            const contentLength=+uploadResponse.headers.get('Content-Length');
            const reader=uploadResponse.body.getReader();
            let receivedLength=0;
            let chunks=[];
            while(true){
                const{done,value}=await reader.read();
                if(done) break;
                chunks.push(value);
                receivedLength+=value.length;
                uploadProgress.style.width=`${(receivedLength /contentLength)*100}%`;
            }

            const responseArray=new Uint8Array(receivedLength);
            let position=0;
            for(const chunk of chunks){
                responseArray.set(chunk,position);
                position+=chunk.length;
            }

            const text=new TextDecoder('utf-8').decode(responseArray);
            const{result:{upload_id}}=JSON.parse(text);

            const[colorResult,tagResult]=await Promise.all
            ([
                
                fetch(`https://api.imagga.com/v2/colors?image_upload_id=${upload_id}`,{
                headers:{'Authorization':authHeader}}).then(res=>res.json()),
                fetch(`https://api.imagga.com/v2/tags?image_upload_id=${upload_id}`,{
                    headers:{'Authorization':authHeader}}).then(res=>res.json()),
            ]);

            displayColors(colorResult.result.colors);
            displayTags(tagsResult.result.tags);
        }catch(error){
            console.error('Hata', error);  
            showToast('Resim işlenirken hata oluştu!');  
        }finally{
            uploadModal.style.display='none';
        }
});

const displayColors=colors=>{
    const colorContainer=document.querySelector('colors-container');
    colorContainer.innerHTML='';

    if(![colors.background_colors,colors.foreground_colors,colors.image_colors].some(ar=>arr.length)){
        colorContainer.innerHTML='<p class="error">Şuanda hiçbirşey görüntülenmiyor...</p>'
        return;
    }
    const generateColorSection=(title,colorData)=>{
        return ` 
        <h3>${title}</h3>
        <div class="results">
        ${colorData.map(({html_code,closest_palette_color,percent})=>
            `
            <div class="result-item" data-color="${html_code}">
            <div>
            <div class="color-box" 
            style="background-color:
            ${html_code}"
            title="Color code:${html_code}"></div>
            <p>${html_code}<span>-$
            {closest_palette_color}</span></p>
            </div>
            <div class="progress-bar">
            <span>${percent.toFixed
            (2)}%</span>
            <div class="progress" 
            style="width:${percent}
            %"></div>
        </div>
        </div>
        `).join('')}
            </div>
        `; 
    };

    colorContainer.innerHTML+=generateColorSection('Background Colors',colors.background_colors);
    colorContainer.innerHTML+=generateColorSection('Foreground Colors',colors.foreground_colors);
    colorContainer.innerHTML+=generateColorSection('Image Colors',colors.image_colors);

    document.querySelectorAll('.colors-container .result-item').forEach(item=>{
        item.addEventListener('click',()=>{
            const colorCode=item.getAttribute('data-color');
            navigator.clipboard.writeText(colorCode).then(()=>showToast( `Kopyalandı:${colorCode} `)).catch(()=>showToast('Hata, renk kopyalanamadı!'));
        });
    });
};

let allTags=[];
let displayedTags=0;

const displayTags=tags=>{
    const tagContainers=document.querySelector('.tags-container');
    const resultList=document.querySelector('.results');
    const error=document.querySelector('.error');
    const seeMoreButton=document.querySelector('.seeMore');
    const exportTagsButton=document.querySelector('.exportTags');
 
    if(resultList){
        resultList.innerHTML='';
    }
    else{
        const resultListContainer=document.createElement('div');
        resultListContainer.className='results';
        tagContainers.insertBefore(resultListContainer,seeMoreButton);
    }
    allTags=tags;
    displayTags=0;


    const showMoreTags=()=>{
        const tagsToShow=allTags.slice(displayTags,displayTags+tagsPerPage);
        displayTags+=tagsToShow.length;

        const tagsHtml=tagsToShow.map(({tag:{en}})=> `
            <div class="result-item">
            <p>${en}</p>
            </div>
        `).join('');

        if(resultList){
            resultList.innerHTML+=tagsHtml;
        }

        error.style.display=displayedTags>0?'none':'block';
        seeMoreButton.style.display=allTags.length <0 ? 'block':'none';
        exportTagsButton.style.display=displayedTags>0?'block':'none';
    };
    showMoreTags();

    seeMoreButton.addEventListener('click',showMoreTags);
    exportTagsButton.addEventListener('click',exportTagsToFile);
};

const exportTagsToFile=()=>{
    if(allTags.length===0){
        showToast('Etiketler dışarı entegre edilemedi');
        return;
    }
    const tagsText=allTags.map(({tag:{en}})=>en).join('\n');
    const blob=new Blob([tagsText],{type:'plain'});
    const url=URL.createObjectURL(blob);
    const a=document.createDocumentFragment('a');
    a.href=url;
    a.download='etiket.txt';
    a.click();
    URL.revokeObjectURL(url);
};

const showToast = message => {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

   
    setTimeout(() => toast.classList.add('show'), 100);

   
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => document.body.removeChild(toast), 500);
    }, 3000); 
};