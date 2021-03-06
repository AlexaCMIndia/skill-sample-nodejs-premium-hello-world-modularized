const Alexa = require('ask-sdk-core');
const utils = require("./utils");

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        console.log('Handler: LaunchRequestHandler');
        const speechOutput = handlerInput.t('WELCOME_MSG');

        return handlerInput.responseBuilder
            .speak(speechOutput)
            .reprompt(speechOutput)
            .withSimpleCard(handlerInput.t('SKILL_NAME'), speechOutput)
            .getResponse();
    }
};

const GetAnotherHelloHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'SimpleHelloIntent');
    },
    async handle(handlerInput) {
        console.log('Handler: GetAnotherHelloHandler');
        const locale = Alexa.getLocale(handlerInput.requestEnvelope);
        const monetizationClient = handlerInput.serviceClientFactory.getMonetizationServiceClient();
        const preSpeechText = '';
        // productList contains the list of all ISP products for this skill.
        const productList = await monetizationClient.getInSkillProducts(locale);
        // Use the helper function getResponseBasedOnAccessType to determine the response based on the products the customer has purchased
        return utils.getResponseBasedOnAccessType(handlerInput, productList, preSpeechText);
    }
};

// Respond to the utterance "what can I buy"
const AvailableProductsIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AvailableProductsIntent';
    },
    async handle(handlerInput) {
        console.log('Handler: AvailableProductsIntentHandler');
        // Get the list of products available for in-skill purchase
        const locale = Alexa.getLocale(handlerInput.requestEnvelope);
        const monetizationClient = handlerInput.serviceClientFactory.getMonetizationServiceClient();
        // productList contains the list of all ISP products for this skill.
        const productList = await monetizationClient.getInSkillProducts(locale);
        // We now need to filter this to find the ISP products that are available for purchase
        const purchasableProducts = productList.inSkillProducts.filter(item => item.purchasable === 'PURCHASABLE');
        // Say the list of products
        let speechOutput, repromptOutput;
        if (purchasableProducts.length > 0) {
            // One or more products are available for purchase. say the list of products
            speechOutput = handlerInput.t('PRODUCT_LIST_MSG', { products: utils.getSpeakableListOfProducts(purchasableProducts, handlerInput) });
            repromptOutput = handlerInput.t('REPROMPT_MSG');
            return handlerInput.responseBuilder
                .speak(speechOutput)
                .reprompt(repromptOutput)
                .getResponse();
        }
        // no products are available for purchase. Ask if they would like to hear another greeting
        speechOutput = handlerInput.t('NO_PURCHASABLE_PRODUCT_MSG') + ' ' + handlerInput.t('YES_NO_QUESTION');
        repromptOutput = handlerInput.t('REPROMPT_MSG');
        return handlerInput.responseBuilder
            .speak(speechOutput)
            .reprompt(repromptOutput)
            .getResponse();
    }
};

const DescribeProductIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'DescribeProductIntent';
    },
    async handle(handlerInput) {
        console.log('Handler: DescribeProductIntentHandler');
        const productReferenceName = 'Greetings_Pack';
        const locale = Alexa.getLocale(handlerInput.requestEnvelope);
        let speechOutput, repromptOutput;

        const monetizationClient = handlerInput.serviceClientFactory.getMonetizationServiceClient();
        // productList contains the list of all ISP products for this skill.
        const productList = await monetizationClient.getInSkillProducts(locale);
        // In the list of products available for purchase find the product with a matching id and purchasable status
        const product = productList.inSkillProducts.find(item => item.referenceName === productReferenceName && item.purchasable === 'PURCHASABLE');
        // Purchasable. Make the upsell
        speechOutput = handlerInput.t('SURE_MSG');
        if (product) {
            // since they are interested and it's purchasable we can try to upsell the product
            const upsellMessage = `${speechOutput + handlerInput.t('LEARN_MORE_PROMPT')}`;
            // upsell directive is similar to the buy directive but allows you to pass a custom message + user confirmation
            return utils.upsellDirective(handlerInput, upsellMessage, product);
        } else {
            speechOutput = handlerInput.t('NO_PURCHASABLE_PRODUCT_MSG') + ' ' + handlerInput.t('YES_NO_QUESTION');
            repromptOutput = handlerInput.t('YES_NO_QUESTION');

            return handlerInput.responseBuilder
                .speak(speechOutput)
                .reprompt(repromptOutput)
                .getResponse();
        }
    }
};

const BuyProductIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'BuyProductIntent';
    },
    async handle(handlerInput) {
        console.log('Handler: BuyProductIntentHandler');
        const productReferenceName = 'Greetings_Pack';
        const locale = Alexa.getLocale(handlerInput.requestEnvelope);
        let speechOutput, repromptOutput;

        const monetizationClient = handlerInput.serviceClientFactory.getMonetizationServiceClient();
        // productList contains the list of all ISP products for this skill.
        const productList = await monetizationClient.getInSkillProducts(locale);
        console.log('product list:' + JSON.stringify(productList));
        // In the list of products available for purchase find the product with a matching id and purchasable status
        const product = productList.inSkillProducts.find(item => item.referenceName === productReferenceName && item.purchasable === 'PURCHASABLE');
        if (product) {
            return utils.buyDirective(handlerInput, product);
        } else {
            speechOutput = handlerInput.t('NO_PURCHASABLE_PRODUCT_MSG') + ' ' + handlerInput.t('YES_NO_QUESTION');
            repromptOutput = handlerInput.t('YES_NO_QUESTION');

            return handlerInput.responseBuilder
                .speak(speechOutput)
                .reprompt(repromptOutput)
                .getResponse();
        }
    }
};

const UpsellOrBuyResponseHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'Connections.Response'
            && (handlerInput.requestEnvelope.request.name === 'Buy'
                || handlerInput.requestEnvelope.request.name === 'Upsell');
    },
    async handle(handlerInput) {
        console.log('Handler: UpsellBuyResponseHandler');
        const locale = Alexa.getLocale(handlerInput.requestEnvelope);
        const {request} = handlerInput.requestEnvelope;
        const {productId} = request.payload;
        console.log(request.name + ' connections payload: ' + JSON.stringify(request.payload));
        const monetizationClient = handlerInput.serviceClientFactory.getMonetizationServiceClient();
        // productList contains the list of all ISP products for this skill.
        const productList = await monetizationClient.getInSkillProducts(locale);
        // In the list of products available for purchase find the product with a matching id
        const product = productList.inSkillProducts.find(item => item.productId === productId);
        console.log('Product in response: ' + JSON.stringify(product));
        if (request.status.code === '200' && request.payload.purchaseResult !== 'ERROR') {
            let preSpeechText;
            // check the status - accepted, declined, already purchased, or something went wrong.
            switch (request.payload.purchaseResult) {
                case 'ACCEPTED':
                case 'ALREADY_PURCHASED':
                    //preSpeechText = handlerInput.t('PRODUCT_OWNED_MSG', { productName: product.name });
                    //break;
                case 'DECLINED':
                    preSpeechText = '';
                    break;
                default:
                    preSpeechText = handlerInput.t('BUY_UNKNOWN_RESULT_MSG', { productName: product.name });
                    break;
            }
            // respond back to the customer
            return utils.getResponseBasedOnAccessType(handlerInput, productList, preSpeechText);
        }
        // Request Status Error. Something has failed with the connection.
        console.log('Connections.Response indicated failure. error: ' + request.payload.message);
        return handlerInput.responseBuilder
            .speak(handlerInput.t('BUY_ERROR_MSG'))
            .getResponse();
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        console.log('Handler: HelpIntentHandler');
        const speechOutput = handlerInput.t('HELP_MSG');

        return handlerInput.responseBuilder
            .speak(speechOutput)
            .reprompt(speechOutput)
            .withSimpleCard(handlerInput.t('SKILL_NAME'), speechOutput)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent');
    },
    async handle(handlerInput) {
        console.log('Handler: CancelAndStopIntentHandler');
        const locale = Alexa.getLocale(handlerInput.requestEnvelope);
        const monetizationClient = handlerInput.serviceClientFactory.getMonetizationServiceClient();
        const productList = await monetizationClient.getInSkillProducts(locale);
        speechOutput = handlerInput.t('SIMPLE_GOODBYES');

        return handlerInput.responseBuilder
            .speak(speechOutput)
            .withShouldEndSession(true)
            .getResponse();
    }
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

        return handlerInput.responseBuilder.getResponse();
    }
};

const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`Error handled: ${JSON.stringify(error)}`);
        const speechOutput = handlerInput.t('ERROR_MSG');

        return handlerInput.responseBuilder
            .speak(speechOutput)
            .reprompt(speechOutput)
            .getResponse();
    }
};

const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
    .addRequestHandlers(
        LaunchRequestHandler,
        GetAnotherHelloHandler,
        AvailableProductsIntentHandler,
        DescribeProductIntentHandler,
        BuyProductIntentHandler,
        UpsellOrBuyResponseHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler)
    .addErrorHandlers(ErrorHandler)
    .addRequestInterceptors(
        utils.LogRequestInterceptor,
        utils.LocalisationRequestInterceptor)
    .withApiClient(new Alexa.DefaultApiClient())
    .withCustomUserAgent('sample/premium-hello-world/v1.2.1')
    .lambda();
