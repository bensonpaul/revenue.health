const request = require('request');
const CONFIGURATION = require('./configuration');
const fs = require('fs');
const TurndownService = require('turndown');
const turndownService = new TurndownService();
const sharp = require("sharp");
const path = require('path');
getRequest = (options, json = true) => new Promise((resolve, reject) => {
    request.get(options, function(err, resp, body) {
        if (err) {
            reject(err);
        } else {
            if (json) {
                resolve(JSON.parse(body));
            } else {
                resolve(body);
            }
        }
    });
});

async function main() {

    // Setting URL and headers for request
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': CONFIGURATION.authToken
    }
    const options = {
        url: CONFIGURATION.apiUrl + 'projects/' + CONFIGURATION.projectId + '/work_packages',
        method: 'GET',
        headers: headers,
    }
    await getRequest(options).then(async function(response) {
            const totalWorkPackages = response.total;
            let totalLength = Number(totalWorkPackages) / 50;
            totalLength = Math.trunc(totalLength) + 1;
            let total = totalWorkPackages;
            let offset = 0;
            for (let i = 0; i < totalLength; i++) {
                offset = i + 1;
                options.url = CONFIGURATION.apiUrl + 'projects/' + CONFIGURATION.projectId + '/work_packages?offset=' + offset + '&pageSize=' + 50;
                await getRequest(options).then(async function(result) {
                        let workPackages = result['_embedded']['elements'];
                        for (const item of workPackages) {
                            if(item['id'] != 536){
                            let mdContent = '';
                            let sourceBaseUrl = '';
                            sourceBaseUrl = item[CONFIGURATION.cleanUrlField];
                            if (sourceBaseUrl) {
                                sourceBaseUrl = sourceBaseUrl.split('/');
                                sourceBaseUrl = sourceBaseUrl[2];
                            }
                            if (item['startDate']) {
                                item['createdAt'] = item['startDate'];
                            }
                            var title = item['subject'].replace(/[^\x20-\x7E]/g, '');
                            let mdFileName = item['subject'].replace(/[^a-z\d\s]+/gi, " ");
                            mdFileName = mdFileName.trim();
                            mdContent = "--- \ntitle: " + '"' + title + '"' + "\ncleanUrl: " + '"' + item[CONFIGURATION.cleanUrlField] + "" + '"' + "\ndate: " + '"' + item['createdAt'] + "" + '"' + "\n";
                            mdContent = mdContent + "sourceBaseUrl: " + '"' + sourceBaseUrl + '"' + "\n";
                            if (item['_links']['attachments']) {
                                let attachMentUrl = item['_links']['attachments']['href'];
                                attachMentUrl = CONFIGURATION.baseUrl + attachMentUrl;
                                options.url = attachMentUrl;
                                await getRequest(options).then(async function(response) {
                                    if (response['_embedded']['elements'].length > 0) {
                                        const elements = response['_embedded']['elements'];
                                        let featuredImageUrl = '';
                                        let pdfUrl = '';
                                        let metaDataUrl = '';
                                        let ogSiteName = '';
                                        let attachment_title = '';
                                        let curated_attachment_basename = '';
                                        let curated_attachment_extension = '';
                                        let extension_img = '';
                                        let imagePath = '';
										let resizedFile = '';
										let resizedImagePath = '';
                                        let pdfPath = '';
                                        elements.some(function(attachment, index, _arr) {
                                            if (attachment['_links']['self']['title']) {
                                                attachment_title = attachment['_links']['self']['title'];
                                                curated_attachment_extension = path.extname(attachment_title);
                                                curated_attachment_basename = path.basename(attachment_title, curated_attachment_extension);
                                                if (attachment_title === 'Curated_Featured_Image.pdf') {
                                                    pdfUrl = attachment['_links']['self']['href'];
                                                    pdfUrl = CONFIGURATION.baseUrl + pdfUrl + '/content';
                                                } else if (curated_attachment_basename == 'Curated_Featured_Image') {
                                                    featuredImageUrl = attachment['_links']['self']['href'];
                                                    featuredImageUrl = CONFIGURATION.baseUrl + featuredImageUrl + '/content';
                                                    extension_img = path.extname(attachment_title);
                                                } else if (attachment_title === 'Lectio_Extension_Curation.json') {
                                                    metaDataUrl = attachment['_links']['self']['href'];
                                                    metaDataUrl = CONFIGURATION.baseUrl + metaDataUrl + '/content';
                                                }
                                            }
                                        });
                                        if (featuredImageUrl !== '' && extension_img != '') {
                                            options.url = featuredImageUrl;
                                            options['encoding'] = 'binary';
                                            await getRequest(options, false).then(async function(responseData) {
                                                let fileName = item['subject'].replace(/[^a-z\d\s]+/gi, "");
                                                fileName = fileName.trim();
												resizedFile = "static/img/resources/thumbs/" + fileName + '_800W' + extension_img;
												resizedImagePath = "/img/resources/thumbs/" + fileName + '_800W' + extension_img;
                                                fileName = fileName + extension_img;
                                                imagePath = "/img/resources/" + fileName;
                                                mdContent = mdContent + "banner : " + '"' + imagePath + '"' + "\n";
                                                fs.writeFile("static/img/resources/" + fileName, responseData, 'binary', function(err) {
                                                    if (err) {
                                                        console.log(err);
                                                    } else {
                                                        console.log(fileName, "-image is saved!");
													   	sharp("static/img/resources/" + fileName)
														  .resize({ width: 800 })
														  .toFile(resizedFile, function(err) {
															// output.jpg is a 800 pixels wide
															// containing a scaled and cropped version of input.jpg
														 });
                                                    }
                                                });
                                            });
                                        } else {
                                            imagePath = "img/default.png";
                                            mdContent = mdContent + "banner: " + '"' + imagePath + '"' + "\n";
                                            fs.writeFile('content/news/' + mdFileName + '.md', mdContent, function(err) {
                                                if (err) {
                                                    throw err
                                                } else {
                                                    console.log(mdFileName, 'Saved successfully!');
                                                }
                                            });
                                        }
                                        if (pdfUrl !== '') {
                                            options.url = pdfUrl;
                                            options['encoding'] = 'binary';
                                            await getRequest(options, false).then(async function(responseData) {
                                                let pdfFileName = item['subject'].replace(/[^a-z\d\s]+/gi, "");
                                                pdfFileName = pdfFileName.trim();
                                                pdfFileName = pdfFileName + '.pdf';
                                                pdfPath = "/img/resources/" + pdfFileName;
                                                mdContent = mdContent + "pdfURL : " + '"' + pdfPath + '"' + "\n";
                                                fs.writeFile("static/img/resources/" + pdfFileName, responseData, 'binary', function(err) {
                                                    if (err) {
                                                        console.log(err);
                                                    } else {
                                                        console.log(pdfFileName, "-pdf is saved!");
                                                    }
                                                });
                                            });
                                        }
                                        if (metaDataUrl !== '') {
                                            options.url = metaDataUrl;
                                            await getRequest(options, false).then(async function(metaDataResponse) {
                                                metaDataResponse = JSON.parse(metaDataResponse);
                                                for (const meta of metaDataResponse) {
                                                    if (meta['name'] === 'openGraphMetaData') {
                                                        const openGraphMetaData = meta['content'];
                                                        for (const openMeta of openGraphMetaData) {
                                                            openMeta['content'] = openMeta['content'].replace(/[^\x20-\x7E]/g, '');
                                                            openMeta['content'] = openMeta['content'].replace(/\"/g, "");
                                                            if (openMeta['name'] === 'og:title') {
                                                                mdContent = mdContent + "ogTitle: " + '"' + openMeta['content'] + '"' + "\n";
                                                            } else if (openMeta['name'] === 'og:description') {
                                                                mdContent = mdContent + "ogDescription: " + '"' + openMeta['content'] + '"' + "\n";
                                                            } else if (openMeta['name'] === 'og:type') {
                                                                mdContent = mdContent + "ogType: " + '"' + openMeta['content'] + '"' + "\n";
                                                            } else if (openMeta['name'] === 'og:site_name') {
                                                                ogSiteName = openMeta['content'];
                                                                mdContent = mdContent + "ogSiteName: " + '"' + ogSiteName + '"' + "\n";
                                                            } else if (openMeta['name'] === 'og:image') {
                                                                //mdContent = mdContent + "ogImage: " + '"' + openMeta['content'] + '"' + "\n";
                                                               // mdContent = mdContent + "ogImage: " + '"' + imagePath + '"' + "\n";
																  mdContent = mdContent + "ogImage: " + '"' + resizedImagePath + '"' + "\n";	   
                                                            }
                                                        }
                                                    }
                                                    if (meta['name'] === 'twitterMetaData') {
                                                        const twitterMetaData = meta['content'];
                                                        for (const twitterMeta of twitterMetaData) {
                                                            twitterMeta['content'] = twitterMeta['content'].replace(/[^\x20-\x7E]/g, '');
                                                            twitterMeta['content'] = twitterMeta['content'].replace(/\"/g, "");
                                                            if (twitterMeta['name'] === 'twitter:card') {
                                                                mdContent = mdContent + "twitterCard: " + '"' + twitterMeta['content'] + '"' + "\n";
                                                            } else if (twitterMeta['name'] === 'twitter:description') {
                                                                mdContent = mdContent + "twitterDescription: " + '"' + twitterMeta['content'] + '"' + "\n";
                                                            } else if (twitterMeta['name'] === 'twitter:title') {
                                                                mdContent = mdContent + "twitterTitle: " + '"' + twitterMeta['content'] + '"' + "\n";
                                                            } else if (twitterMeta['name'] === 'twitter:site') {
                                                                mdContent = mdContent + "twitterSite: " + '"' + twitterMeta['content'] + '"' + "\n";
                                                            } else if (twitterMeta['name'] === 'twitter:image') {
                                                                //mdContent = mdContent + "twitterImage: " + '"' + twitterMeta['content'] + '"' + "\n";
                                                               // mdContent = mdContent + "twitterImage: " + '"' + imagePath + '"' + "\n";
															    mdContent = mdContent + "twitterImage: " + '"' + resizedImagePath + '"' + "\n";
                                                            } else if (twitterMeta['name'] === 'twitter:creator') {
                                                                mdContent = mdContent + "twitterCreator: " + '"' + twitterMeta['content'] + '"' + "\n";
                                                            }
                                                        }
                                                    }
                                                }
                                            });
                                        }
                                    } // if embeds length close
                                    else{
                                        let defaultImagePath = "img/default.png";
                                        mdContent = mdContent + "banner: " + '"' + defaultImagePath + '"' + "\n";
                                    }
                                }); //await attachment curate close
                            } //if link attachments close
                            else {
                                let defaultImagePath = "img/default.png";
                                mdContent = mdContent + "banner: " + '"' + defaultImagePath + '"' + "\n";
                            }
                            const layoutName = 'news_single';
                            mdContent = mdContent + "layout: " + '"' + layoutName + '"' + "\n";
                            mdContent = mdContent + "breadcrumbs:\n - Home\n - News\n - " + mdFileName + "\n";
                            mdContent = mdContent + "breadcrumbLinks:\n - / \n - /news\n - / \n";
                            mdContent = mdContent + "---\n" + turndownService.turndown(item['description']['raw'].replace(/[^\x20-\x7E]/g, '')) + "\n";
                            fs.writeFile('content/news/' + mdFileName + '.md', mdContent, function(err) {
                                if (err) {
                                    throw err
                                } else {
                                    console.log(mdFileName, 'Saved successfully!');
                                }
                            });
                        } //if lectio close

                        } //for close
                    },
                    function(err) {
                        console.log(err);
                    });
            }

            // totalLength = Number(totalLength) + 1;
        },
        function(err) {
            console.log(err);
        })
}

main();