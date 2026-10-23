export const demoUsers={admin:{email:'admin@pulsefit.com',password:'admin123',name:'Marina Costa'},aluno:{email:'aluno@pulsefit.com',password:'aluno123',name:'Lucas Almeida'},treinador:{email:'treinador@pulsefit.com',password:'treino123',name:'Rafael Souza'}};
export const initialMembers=[{id:'1',full_name:'Lucas Almeida',plan:'Performance',status:'active'},{id:'2',full_name:'Ana Beatriz',plan:'Essencial',status:'active'},{id:'3',full_name:'Pedro Henrique',plan:'Performance',status:'pending'},{id:'4',full_name:'Juliana Mendes',plan:'Black',status:'active'},{id:'5',full_name:'Bruno Lima',plan:'Essencial',status:'inactive'}];
export const initialNotices=[{id:'1',title:'Manutenção preventiva',body:'A sala de bike ficará indisponível das 13h às 14h na sexta-feira.',created_at:new Date().toISOString()},{id:'2',title:'Aula especial',body:'Treino funcional especial sábado às 09h com vagas limitadas.',created_at:new Date().toISOString()}];
export const slots=['06:00','07:00','08:00','12:00','17:00','18:00','19:00','20:00'];
export const today=()=>new Date().toLocaleDateString('en-CA');
export const localGet=(key,def)=>{try {const raw=localStorage.getItem('pulsefit:'+key);return raw?JSON.parse(raw):def;}catch{return def;}};
export const localSet=(key,val)=>localStorage.setItem('pulsefit:'+key,JSON.stringify(val));
