import moment from 'moment';
import { ref } from 'vue';

const currentDate = moment(new Date()).format('YYYY-MM-DDThh:mm');

export const settings = ref({
    amount: ref(1),
    keepAmount: false,
    date: ref(currentDate),
    keepDate: false,
    owner: ref(''),
    keepOwner: false,
    reason: ref(''),
    keepReason: false,
});