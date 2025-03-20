// bgImg is the background image to be modified.
// fgImg is the foreground image.
// fgOpac is the opacity of the foreground image. (Already given as between 0 and 1)
// fgPos is the position of the foreground image in pixels. It can be negative and (0,0) means the top-left pixels of the foreground and background are aligned.
function composite(bgImg, fgImg, fgOpac, fgPos )
{
    //Unpac the images
    //Note images are packed in the following array [R1,G1,B1,Alpha1,R2,...] in interleaved order
    let bgData = bgImg.data;
    let fgData = fgImg.data;

    //Loop through the pixels
    for(let bgX=0; bgX <= bgImg.width; bgX++){
        for(let bgY=0; bgY <= bgImg.height; bgY++){

            //If pixel isnt on background image anymore - no need to change pixel value
            if(bgX-fgPos.x<0 || bgY-fgPos.y < 0 || bgX-fgPos.x>=bgImg.width || bgY-fgPos.y>=bgImg.height){
                //pass
            }

            //Else pixel is sill on background image
            else{
                //Get the positions in the foreground image we need to merge with the background
                let fgX = bgX - fgPos.x;
                let fgY = bgY - fgPos.y;

                //Get the start index for each image
                let fgStartIndex = 4*(fgY*fgImg.width+fgX);
                let bgStartIndex = 4*(bgY*bgImg.width+bgX);

                //Calculate the final alpha for the pixel based on fgAlpha for the pixel and fgOpac
                let alpha = fgData[fgStartIndex+3]/255 * fgOpac;

                //Change red in background
                bgData[bgStartIndex] = (1-alpha)*bgData[bgStartIndex] + (alpha)*fgData[fgStartIndex]
                //Change green in background
                bgData[bgStartIndex+1] = (1-alpha)*bgData[bgStartIndex+1] + (alpha)*fgData[fgStartIndex+1]
                //Change blue in background
                bgData[bgStartIndex+2] = (1-alpha)*bgData[bgStartIndex+2] + (alpha)*fgData[fgStartIndex+2]
                //Change alpha in background --> Merge them the same as for the colors however we do not need to take fgData[fgStartIndex+3] into account as it is alreay implicitly in alpha
                //Also note we have to renormalize with *255 as we want a bit representation
                bgData[bgStartIndex + 3] = ((1-alpha)*(bgData[bgStartIndex+3]/255) + alpha*1) * 255
                
            }
            
        }
    }
}
