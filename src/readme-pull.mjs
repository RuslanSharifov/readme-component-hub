import {parseRepo} from './neon-core.mjs';

/** Fetch the complete root README as UTF-8, preserving the file exactly. */
export async function fetchRepositoryReadme(repository,fetcher=fetch){
  const slug=parseRepo(repository);
  const response=await fetcher('https://api.github.com/repos/'+slug+'/readme',{
    headers:{Accept:'application/vnd.github+json'}
  });
  if(!response.ok){
    if(response.status===404)throw new Error('README.md tapılmadı və ya repository şəxsi repodur.');
    if(response.status===403||response.status===429)throw new Error('GitHub API limiti dolub. Bir qədər sonra yenidən yoxla.');
    throw new Error('GitHub README yüklənmə xətası: '+response.status);
  }
  const data=await response.json();
  if(!data||data.type!=='file'||typeof data.content!=='string'||data.encoding!=='base64'){
    throw new Error('GitHub README faylının formatı dəstəklənmir.');
  }
  // GitHub's contents API uses RFC 4648 base64, often wrapped in newlines.
  const value=data.content.replace(/\s+/g,'');
  if(!value||value.length>5_600_000||!/^[A-Za-z0-9+/]*={0,2}$/.test(value)||value.length%4!==0){
    throw new Error('README məzmunu boşdur, çox böyükdür və ya düzgün kodlaşdırılmayıb.');
  }
  try{
    const bytes=Uint8Array.from(atob(value),ch=>ch.charCodeAt(0));
    return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  }catch{
    throw new Error('README.md UTF-8 mətn formatında deyil.');
  }
}
