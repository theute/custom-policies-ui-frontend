import * as React from 'react';
import { useField } from 'formik';
import { FormGroup, FormSelect as PFFormSelect } from '@patternfly/react-core';

import { onChangePFAdapter } from './Common';

// Todo: Check correct typing for the props
export const FormSelect = (props: any) => {
    const [ field, meta ] = useField({ ...props });
    const isValid = !meta.error || !meta.touched;

    return (
        <FormGroup
            fieldId={ props.id }
            helperTextInvalid={ meta.error }
            isRequired={ props.isRequired }
            isValid={ isValid }
            label={ props.label }
        >
            <PFFormSelect
                { ...props }
                { ...field }
                onChange={ onChangePFAdapter<string | number>(field) }
                isValid={ isValid }
            >
                { props.children }
            </PFFormSelect>
        </FormGroup>
    );
};
