import{d as H,a as p,b as P,aX as te,aY as ne,bx as ae,e as g,n as m,g as W,h,t as $,by as w,be as ie,u as j,i as T,am as I,j as E,k,bg as le,l as _,B as de,bh as se,b4 as ce,bz as pe,bA as ge,A as O,m as he}from"./index-D0h4CHmi.js";import{g as be}from"./get-slot-Bk_rJcZu.js";const me={paddingSmall:"12px 16px 12px",paddingMedium:"19px 24px 20px",paddingLarge:"23px 32px 24px",paddingHuge:"27px 40px 28px",titleFontSizeSmall:"16px",titleFontSizeMedium:"18px",titleFontSizeLarge:"18px",titleFontSizeHuge:"18px",closeIconSize:"18px",closeSize:"22px"};function fe(e){const{primaryColor:i,borderRadius:l,lineHeight:o,fontSize:t,cardColor:r,textColor2:b,textColor1:s,dividerColor:d,fontWeightStrong:a,closeIconColor:n,closeIconColorHover:c,closeIconColorPressed:v,closeColorHover:f,closeColorPressed:u,modalColor:C,boxShadow1:S,popoverColor:F,actionColor:x}=e;return Object.assign(Object.assign({},me),{lineHeight:o,color:r,colorModal:C,colorPopover:F,colorTarget:i,colorEmbedded:x,colorEmbeddedModal:x,colorEmbeddedPopover:x,textColor:b,titleTextColor:s,borderColor:d,actionColor:x,titleFontWeight:a,closeColorHover:f,closeColorPressed:u,closeBorderRadius:l,closeIconColor:n,closeIconColorHover:c,closeIconColorPressed:v,fontSizeSmall:t,fontSizeMedium:t,fontSizeLarge:t,fontSizeHuge:t,boxShadow:S,borderRadius:l})}const ue={common:H,self:fe},xe=p([P("card",`
 font-size: var(--n-font-size);
 line-height: var(--n-line-height);
 display: flex;
 flex-direction: column;
 width: 100%;
 box-sizing: border-box;
 position: relative;
 border-radius: var(--n-border-radius);
 background-color: var(--n-color);
 color: var(--n-text-color);
 word-break: break-word;
 transition: 
 color .3s var(--n-bezier),
 background-color .3s var(--n-bezier),
 box-shadow .3s var(--n-bezier),
 border-color .3s var(--n-bezier);
 `,[ae({background:"var(--n-color-modal)"}),g("hoverable",[p("&:hover","box-shadow: var(--n-box-shadow);")]),g("content-segmented",[p(">",[m("content",{paddingTop:"var(--n-padding-bottom)"})])]),g("content-soft-segmented",[p(">",[m("content",`
 margin: 0 var(--n-padding-left);
 padding: var(--n-padding-bottom) 0;
 `)])]),g("footer-segmented",[p(">",[m("footer",{paddingTop:"var(--n-padding-bottom)"})])]),g("footer-soft-segmented",[p(">",[m("footer",`
 padding: var(--n-padding-bottom) 0;
 margin: 0 var(--n-padding-left);
 `)])]),p(">",[P("card-header",`
 box-sizing: border-box;
 display: flex;
 align-items: center;
 font-size: var(--n-title-font-size);
 padding:
 var(--n-padding-top)
 var(--n-padding-left)
 var(--n-padding-bottom)
 var(--n-padding-left);
 `,[m("main",`
 font-weight: var(--n-title-font-weight);
 transition: color .3s var(--n-bezier);
 flex: 1;
 min-width: 0;
 color: var(--n-title-text-color);
 `),m("extra",`
 display: flex;
 align-items: center;
 font-size: var(--n-font-size);
 font-weight: 400;
 transition: color .3s var(--n-bezier);
 color: var(--n-text-color);
 `),m("close",`
 margin: 0 0 0 8px;
 transition:
 background-color .3s var(--n-bezier),
 color .3s var(--n-bezier);
 `)]),m("action",`
 box-sizing: border-box;
 transition:
 background-color .3s var(--n-bezier),
 border-color .3s var(--n-bezier);
 background-clip: padding-box;
 background-color: var(--n-action-color);
 `),m("content","flex: 1; min-width: 0;"),m("content, footer",`
 box-sizing: border-box;
 padding: 0 var(--n-padding-left) var(--n-padding-bottom) var(--n-padding-left);
 font-size: var(--n-font-size);
 `,[p("&:first-child",{paddingTop:"var(--n-padding-bottom)"})]),m("action",`
 background-color: var(--n-action-color);
 padding: var(--n-padding-bottom) var(--n-padding-left);
 border-bottom-left-radius: var(--n-border-radius);
 border-bottom-right-radius: var(--n-border-radius);
 `)]),P("card-cover",`
 overflow: hidden;
 width: 100%;
 border-radius: var(--n-border-radius) var(--n-border-radius) 0 0;
 `,[p("img",`
 display: block;
 width: 100%;
 `)]),g("bordered",`
 border: 1px solid var(--n-border-color);
 `,[p("&:target","border-color: var(--n-color-target);")]),g("action-segmented",[p(">",[m("action",[p("&:not(:first-child)",{borderTop:"1px solid var(--n-border-color)"})])])]),g("content-segmented, content-soft-segmented",[p(">",[m("content",{transition:"border-color 0.3s var(--n-bezier)"},[p("&:not(:first-child)",{borderTop:"1px solid var(--n-border-color)"})])])]),g("footer-segmented, footer-soft-segmented",[p(">",[m("footer",{transition:"border-color 0.3s var(--n-bezier)"},[p("&:not(:first-child)",{borderTop:"1px solid var(--n-border-color)"})])])]),g("embedded",`
 background-color: var(--n-color-embedded);
 `)]),te(P("card",`
 background: var(--n-color-modal);
 `,[g("embedded",`
 background-color: var(--n-color-embedded-modal);
 `)])),ne(P("card",`
 background: var(--n-color-popover);
 `,[g("embedded",`
 background-color: var(--n-color-embedded-popover);
 `)]))]),ve={title:[String,Function],contentClass:String,contentStyle:[Object,String],headerClass:String,headerStyle:[Object,String],headerExtraClass:String,headerExtraStyle:[Object,String],footerClass:String,footerStyle:[Object,String],embedded:Boolean,segmented:{type:[Boolean,Object],default:!1},size:{type:String,default:"medium"},bordered:{type:Boolean,default:!0},closable:Boolean,hoverable:Boolean,role:String,onClose:[Function,Array],tag:{type:String,default:"div"},cover:Function,content:[String,Function],footer:Function,action:Function,headerExtra:Function,closeFocusable:Boolean},Ce=Object.assign(Object.assign({},T.props),ve),Me=W({name:"Card",props:Ce,slots:Object,setup(e){const i=()=>{const{onClose:a}=e;a&&de(a)},{inlineThemeDisabled:l,mergedClsPrefixRef:o,mergedRtlRef:t}=j(e),r=T("Card","-card",xe,ue,e,o),b=I("Card",t,o),s=E(()=>{const{size:a}=e,{self:{color:n,colorModal:c,colorTarget:v,textColor:f,titleTextColor:u,titleFontWeight:C,borderColor:S,actionColor:F,borderRadius:x,lineHeight:y,closeIconColor:B,closeIconColorHover:R,closeIconColorPressed:z,closeColorHover:V,closeColorPressed:L,closeBorderRadius:D,closeIconSize:G,closeSize:N,boxShadow:A,colorPopover:q,colorEmbedded:K,colorEmbeddedModal:U,colorEmbeddedPopover:J,[k("padding",a)]:X,[k("fontSize",a)]:Y,[k("titleFontSize",a)]:Q},common:{cubicBezierEaseInOut:Z}}=r.value,{top:ee,left:oe,bottom:re}=le(X);return{"--n-bezier":Z,"--n-border-radius":x,"--n-color":n,"--n-color-modal":c,"--n-color-popover":q,"--n-color-embedded":K,"--n-color-embedded-modal":U,"--n-color-embedded-popover":J,"--n-color-target":v,"--n-text-color":f,"--n-line-height":y,"--n-action-color":F,"--n-title-text-color":u,"--n-title-font-weight":C,"--n-close-icon-color":B,"--n-close-icon-color-hover":R,"--n-close-icon-color-pressed":z,"--n-close-color-hover":V,"--n-close-color-pressed":L,"--n-border-color":S,"--n-box-shadow":A,"--n-padding-top":ee,"--n-padding-bottom":re,"--n-padding-left":oe,"--n-font-size":Y,"--n-title-font-size":Q,"--n-close-size":N,"--n-close-icon-size":G,"--n-close-border-radius":D}}),d=l?_("card",E(()=>e.size[0]),s,e):void 0;return{rtlEnabled:b,mergedClsPrefix:o,mergedTheme:r,handleCloseClick:i,cssVars:l?void 0:s,themeClass:d?.themeClass,onRender:d?.onRender}},render(){const{segmented:e,bordered:i,hoverable:l,mergedClsPrefix:o,rtlEnabled:t,onRender:r,embedded:b,tag:s,$slots:d}=this;return r?.(),h(s,{class:[`${o}-card`,this.themeClass,b&&`${o}-card--embedded`,{[`${o}-card--rtl`]:t,[`${o}-card--content${typeof e!="boolean"&&e.content==="soft"?"-soft":""}-segmented`]:e===!0||e!==!1&&e.content,[`${o}-card--footer${typeof e!="boolean"&&e.footer==="soft"?"-soft":""}-segmented`]:e===!0||e!==!1&&e.footer,[`${o}-card--action-segmented`]:e===!0||e!==!1&&e.action,[`${o}-card--bordered`]:i,[`${o}-card--hoverable`]:l}],style:this.cssVars,role:this.role},$(d.cover,a=>{const n=this.cover?w([this.cover()]):a;return n&&h("div",{class:`${o}-card-cover`,role:"none"},n)}),$(d.header,a=>{const{title:n}=this,c=n?w(typeof n=="function"?[n()]:[n]):a;return c||this.closable?h("div",{class:[`${o}-card-header`,this.headerClass],style:this.headerStyle,role:"heading"},h("div",{class:`${o}-card-header__main`,role:"heading"},c),$(d["header-extra"],v=>{const f=this.headerExtra?w([this.headerExtra()]):v;return f&&h("div",{class:[`${o}-card-header__extra`,this.headerExtraClass],style:this.headerExtraStyle},f)}),this.closable&&h(ie,{clsPrefix:o,class:`${o}-card-header__close`,onClick:this.handleCloseClick,focusable:this.closeFocusable,absolute:!0})):null}),$(d.default,a=>{const{content:n}=this,c=n?w(typeof n=="function"?[n()]:[n]):a;return c&&h("div",{class:[`${o}-card__content`,this.contentClass],style:this.contentStyle,role:"none"},c)}),$(d.footer,a=>{const n=this.footer?w([this.footer()]):a;return n&&h("div",{class:[`${o}-card__footer`,this.footerClass],style:this.footerStyle,role:"none"},n)}),$(d.action,a=>{const n=this.action?w([this.action()]):a;return n&&h("div",{class:`${o}-card__action`,role:"none"},n)}))}}),Se={gapSmall:"4px 8px",gapMedium:"8px 12px",gapLarge:"12px 16px"};function ze(){return Se}const ye={self:ze};let M;function Be(){if(!se)return!0;if(M===void 0){const e=document.createElement("div");e.style.display="flex",e.style.flexDirection="column",e.style.rowGap="1px",e.appendChild(document.createElement("div")),e.appendChild(document.createElement("div")),document.body.appendChild(e);const i=e.scrollHeight===1;return document.body.removeChild(e),M=i}return M}const $e=Object.assign(Object.assign({},T.props),{align:String,justify:{type:String,default:"start"},inline:Boolean,vertical:Boolean,reverse:Boolean,size:{type:[String,Number,Array],default:"medium"},wrapItem:{type:Boolean,default:!0},itemClass:String,itemStyle:[String,Object],wrap:{type:Boolean,default:!0},internalUseGap:{type:Boolean,default:void 0}}),We=W({name:"Space",props:$e,setup(e){const{mergedClsPrefixRef:i,mergedRtlRef:l}=j(e),o=T("Space","-space",void 0,ye,e,i),t=I("Space",l,i);return{useGap:Be(),rtlEnabled:t,mergedClsPrefix:i,margin:E(()=>{const{size:r}=e;if(Array.isArray(r))return{horizontal:r[0],vertical:r[1]};if(typeof r=="number")return{horizontal:r,vertical:r};const{self:{[k("gap",r)]:b}}=o.value,{row:s,col:d}=ge(b);return{horizontal:O(d),vertical:O(s)}})}},render(){const{vertical:e,reverse:i,align:l,inline:o,justify:t,itemClass:r,itemStyle:b,margin:s,wrap:d,mergedClsPrefix:a,rtlEnabled:n,useGap:c,wrapItem:v,internalUseGap:f}=this,u=ce(be(this),!1);if(!u.length)return null;const C=`${s.horizontal}px`,S=`${s.horizontal/2}px`,F=`${s.vertical}px`,x=`${s.vertical/2}px`,y=u.length-1,B=t.startsWith("space-");return h("div",{role:"none",class:[`${a}-space`,n&&`${a}-space--rtl`],style:{display:o?"inline-flex":"flex",flexDirection:e&&!i?"column":e&&i?"column-reverse":!e&&i?"row-reverse":"row",justifyContent:["start","end"].includes(t)?`flex-${t}`:t,flexWrap:!d||e?"nowrap":"wrap",marginTop:c||e?"":`-${x}`,marginBottom:c||e?"":`-${x}`,alignItems:l,gap:c?`${s.vertical}px ${s.horizontal}px`:""}},!v&&(c||f)?u:u.map((R,z)=>R.type===pe?R:h("div",{role:"none",class:r,style:[b,{maxWidth:"100%"},c?"":e?{marginBottom:z!==y?F:""}:n?{marginLeft:B?t==="space-between"&&z===y?"":S:z!==y?C:"",marginRight:B?t==="space-between"&&z===0?"":S:"",paddingTop:x,paddingBottom:x}:{marginRight:B?t==="space-between"&&z===y?"":S:z!==y?C:"",marginLeft:B?t==="space-between"&&z===0?"":S:"",paddingTop:x,paddingBottom:x}]},R)))}}),we={headerFontSize1:"30px",headerFontSize2:"22px",headerFontSize3:"18px",headerFontSize4:"16px",headerFontSize5:"16px",headerFontSize6:"16px",headerMargin1:"28px 0 20px 0",headerMargin2:"28px 0 20px 0",headerMargin3:"28px 0 20px 0",headerMargin4:"28px 0 18px 0",headerMargin5:"28px 0 18px 0",headerMargin6:"28px 0 18px 0",headerPrefixWidth1:"16px",headerPrefixWidth2:"16px",headerPrefixWidth3:"12px",headerPrefixWidth4:"12px",headerPrefixWidth5:"12px",headerPrefixWidth6:"12px",headerBarWidth1:"4px",headerBarWidth2:"4px",headerBarWidth3:"3px",headerBarWidth4:"3px",headerBarWidth5:"3px",headerBarWidth6:"3px",pMargin:"16px 0 16px 0",liMargin:".25em 0 0 0",olPadding:"0 0 0 2em",ulPadding:"0 0 0 2em"};function Pe(e){const{primaryColor:i,textColor2:l,borderColor:o,lineHeight:t,fontSize:r,borderRadiusSmall:b,dividerColor:s,fontWeightStrong:d,textColor1:a,textColor3:n,infoColor:c,warningColor:v,errorColor:f,successColor:u,codeColor:C}=e;return Object.assign(Object.assign({},we),{aTextColor:i,blockquoteTextColor:l,blockquotePrefixColor:o,blockquoteLineHeight:t,blockquoteFontSize:r,codeBorderRadius:b,liTextColor:l,liLineHeight:t,liFontSize:r,hrColor:s,headerFontWeight:d,headerTextColor:a,pTextColor:l,pTextColor1Depth:a,pTextColor2Depth:l,pTextColor3Depth:n,pLineHeight:t,pFontSize:r,headerBarColor:i,headerBarColorPrimary:i,headerBarColorInfo:c,headerBarColorError:f,headerBarColorWarning:v,headerBarColorSuccess:u,textColor:l,textColor1Depth:a,textColor2Depth:l,textColor3Depth:n,textColorPrimary:i,textColorInfo:c,textColorSuccess:u,textColorWarning:v,textColorError:f,codeTextColor:l,codeColor:C,codeBorder:"1px solid #0000"})}const Te={common:H,self:Pe},Fe=P("text",`
 transition: color .3s var(--n-bezier);
 color: var(--n-text-color);
`,[g("strong",`
 font-weight: var(--n-font-weight-strong);
 `),g("italic",{fontStyle:"italic"}),g("underline",{textDecoration:"underline"}),g("code",`
 line-height: 1.4;
 display: inline-block;
 font-family: var(--n-font-famliy-mono);
 transition: 
 color .3s var(--n-bezier),
 border-color .3s var(--n-bezier),
 background-color .3s var(--n-bezier);
 box-sizing: border-box;
 padding: .05em .35em 0 .35em;
 border-radius: var(--n-code-border-radius);
 font-size: .9em;
 color: var(--n-code-text-color);
 background-color: var(--n-code-color);
 border: var(--n-code-border);
 `)]),Re=Object.assign(Object.assign({},T.props),{code:Boolean,type:{type:String,default:"default"},delete:Boolean,strong:Boolean,italic:Boolean,underline:Boolean,depth:[String,Number],tag:String,as:{type:String,validator:()=>!0,default:void 0}}),je=W({name:"Text",props:Re,setup(e){const{mergedClsPrefixRef:i,inlineThemeDisabled:l}=j(e),o=T("Typography","-text",Fe,Te,e,i),t=E(()=>{const{depth:b,type:s}=e,d=s==="default"?b===void 0?"textColor":`textColor${b}Depth`:k("textColor",s),{common:{fontWeightStrong:a,fontFamilyMono:n,cubicBezierEaseInOut:c},self:{codeTextColor:v,codeBorderRadius:f,codeColor:u,codeBorder:C,[d]:S}}=o.value;return{"--n-bezier":c,"--n-text-color":S,"--n-font-weight-strong":a,"--n-font-famliy-mono":n,"--n-code-border-radius":f,"--n-code-text-color":v,"--n-code-color":u,"--n-code-border":C}}),r=l?_("text",E(()=>`${e.type[0]}${e.depth||""}`),t,e):void 0;return{mergedClsPrefix:i,compitableTag:he(e,["as","tag"]),cssVars:l?void 0:t,themeClass:r?.themeClass,onRender:r?.onRender}},render(){var e,i,l;const{mergedClsPrefix:o}=this;(e=this.onRender)===null||e===void 0||e.call(this);const t=[`${o}-text`,this.themeClass,{[`${o}-text--code`]:this.code,[`${o}-text--delete`]:this.delete,[`${o}-text--strong`]:this.strong,[`${o}-text--italic`]:this.italic,[`${o}-text--underline`]:this.underline}],r=(l=(i=this.$slots).default)===null||l===void 0?void 0:l.call(i);return this.code?h("code",{class:t,style:this.cssVars},this.delete?h("del",null,r):r):this.delete?h("del",{class:t,style:this.cssVars},r):h(this.compitableTag||"span",{class:t,style:this.cssVars},r)}});export{We as N,je as a,Me as b};
