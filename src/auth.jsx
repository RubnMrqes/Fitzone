import React,{createContext,useContext,useEffect,useState} from 'react';
import {Navigate,useLocation} from 'react-router-dom';
import {isCloud,supabase} from './lib/supabase';
import {demoUsers,localGet,localSet} from './lib/data';
const Auth=createContext(null);
export const useAuth=()=>useContext(Auth);
export function AuthProvider({children}){
 const [user,setUser]=useState(null),[loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;const refresh=async()=>{if(!isCloud){if(active){setUser(localGet('session',null));setLoading(false)}return}const {data:{session}}=await supabase.auth.getSession();if(!session){if(active){setUser(null);setLoading(false)}return}const {data,error}=await supabase.from('profiles').select('id,full_name,role').eq('id',session.user.id).single();if(active){setUser(error?null:{id:data.id,name:data.full_name,role:data.role,email:session.user.email});setLoading(false)}};refresh();if(!isCloud)return()=>{active=false};const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>{setTimeout(refresh,0)});return()=>{active=false;subscription.unsubscribe()}},[]);
 async function login(email,password){if(!isCloud){const role=Object.keys(demoUsers).find(r=>demoUsers[r].email===email&&demoUsers[r].password===password);if(!role)throw Error('E-mail ou senha incorretos.');const next={id:role==='aluno'?'1':role,email,name:demoUsers[role].name,role};localSet('session',next);setUser(next);return next}
 const {data,error}=await supabase.auth.signInWithPassword({email,password});if(error)throw Error(error.message);const {data:profile,error:profileError}=await supabase.from('profiles').select('role,full_name').eq('id',data.user.id).single();if(profileError||!profile){await supabase.auth.signOut();throw Error('Conta sem perfil. Contate o administrador.')}const next={id:data.user.id,email:data.user.email,name:profile.full_name,role:profile.role};setUser(next);return next}
 async function logout(){if(isCloud)await supabase.auth.signOut();else localStorage.removeItem('pulsefit:session');setUser(null)}
 return <Auth.Provider value={{user,loading,login,logout,isCloud}}>{children}</Auth.Provider>
}
export function Protected({role,children}){const {user,loading}=useAuth();const loc=useLocation();if(loading)return <div className="load-screen">Carregando PulseFit...</div>;if(!user)return <Navigate to="/login" state={{from:loc.pathname}} replace/>;if(user.role!==role)return <Navigate to={'/'+user.role} replace/>;return children}
