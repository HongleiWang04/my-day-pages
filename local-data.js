export function createAccountUI(){return{
 view:()=>'<section class="panel local-data-panel"><h2>本机保存</h2><p>记录和照片自动保存在当前浏览器中。使用AI解析时，仅发送本次文字和事件配置。请定期导出备份；换电脑或浏览器时，可以手动导入。</p><div class="local-data-actions"><button class="full-btn primary" data-action="export">导出备份</button><button class="full-btn" data-action="import">导入备份</button><button class="full-btn" data-action="install">安装到桌面</button></div></section>',
 mount(){},unmount(){},refresh:async()=>{},isBusy:()=>false,hasDraft:()=>false,hasRecoveryToSave:()=>false
};}
