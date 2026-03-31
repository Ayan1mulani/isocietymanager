import { ApiCommon } from "./ApiCommon";
// import { Common } from "./Common";
import {API_URL2}  from '../app/config/env'
const LoginSrv = {
    
    // isLogin: () => {
    //     let user = Common.getLoggedInUser()
    //     if (user) {
    //         let site = Common.getSiteObject()
    //         if(site && site.id === user.society.id){
    //             return user
    //         }else{
    //             LoginSrv.logout()
    //         }
    //     }
    //     return false;
    // },
    // logout: ()=>{
    //     Common.removeLoggedInUser()
    //     Common.removeHistory()
    //     window.location.reload(true);
    // },
    generateOtp: (obj) => {
        let ismUrl = API_URL2 + '/generateotp';
        console.log( API_URL2 + 'generateotp')
        return ApiCommon.postReq(ismUrl, obj);
    },
    resendOtp: (obj) => {
        let ismUrl = API_URL2 + 'resendotp';
        return ApiCommon.postReq(ismUrl, obj);
    },
    validateOtp: (obj) => {
        let ismUrl = API_URL2 + 'validateotp';
        return ApiCommon.postReq(ismUrl, obj);
    },
    getMyAccounts: (token)=>{
        let ismUrl = API_URL2 + 'getmyaccounts?token='+token;
        return ApiCommon.getReq(ismUrl);
    },
    continueLogin: (token, obj) =>{
        let ismUrl = API_URL2 + 'logmein?token='+token;
        return ApiCommon.postReq(ismUrl, obj);
    },
    login: (obj) =>{
        let ismUrl = API_URL2 + '/login';
        return ApiCommon.postReq(ismUrl, obj);
    },
    uploadFile: (file) => {
        var fd = new FormData();
        const config = {     
            headers: { 'content-type': 'multipart/form-data' }
        }
        fd.append('name', (Math.ceil(Math.random()*10000)+ '-' + file.name).replace(/\s/g, '_').replace(/\.[^/.]+$/, ""))
        fd.append('type', 'PUBLIC')
        fd.append('file', file)
        return ApiCommon.postReq(process.env.REACT_APP_DRS_API_URL +'publicupload', fd,config);
    },



   

    // // SIGNED APIS
    // updateProfile :(data)=>{
    //     return ApiCommon.putReq(Util.signUrl(API_URL2 +'updateUserProfile'),data);
    // },
    // getLatestLoggedInUser :()=>{
    //     return ApiCommon.getReq(Util.signUrl(API_URL2 +'getUserProfileData'));
    // },
    // logoutFromSrv :()=>{
    //     return ApiCommon.getReq(Util.signUrl(API_URL2 +'logout'));
    // } 
}
export {LoginSrv};